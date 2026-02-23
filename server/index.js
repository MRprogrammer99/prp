import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend build in production (for Render deployment)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'dist')));
}

// ─── MongoDB Request Setup ───
let requestsCollection = null;
async function setupDB() {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.log('⚠️  No MONGO_URL set. Running without database.');
        return;
    }
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db('whatsapp_bot');
        requestsCollection = db.collection('movie_requests');
        console.log('📦 Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
    }
}
setupDB();

// ─── API Routes ───

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Fetch all requests
app.get('/api/requests', async (req, res) => {
    if (!requestsCollection) return res.json([]);
    try {
        const requests = await requestsCollection.find({}).sort({ timestamp: -1 }).toArray();
        res.json(requests.map(r => ({ ...r, id: r._id.toString() })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new request
app.post('/api/requests', async (req, res) => {
    if (!requestsCollection) return res.status(503).json({ error: 'DB not connected' });
    try {
        const request = {
            ...req.body,
            status: 'requested',
            link: '',
            date: new Date().toLocaleDateString(),
            timestamp: new Date().getTime()
        };
        const result = await requestsCollection.insertOne(request);
        res.json({ ...request, id: result.insertedId.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update request status/link
app.patch('/api/requests/:id', async (req, res) => {
    if (!requestsCollection) return res.status(503).json({ error: 'DB not connected' });
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Auto-set completedAt when status changes to completed
        if (updates.status === 'completed') {
            updates.completedAt = new Date().getTime();
        }

        await requestsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        res.json({ success: true, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete request
app.delete('/api/requests/:id', async (req, res) => {
    if (!requestsCollection) return res.status(503).json({ error: 'DB not connected' });
    try {
        const { id } = req.params;
        await requestsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SPA catch-all for production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
}

// ─── Start ───
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);

    // Self-ping to keep Render awake (free tier sleeps after 15 mins)
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;
    if (RENDER_URL) {
        console.log(`📡 Self-ping active for: ${RENDER_URL}`);
        setInterval(() => {
            fetch(`${RENDER_URL}/api/health`)
                .then(() => console.log('💓 Self-ping successful'))
                .catch(err => console.error('💔 Self-ping failed:', err.message));
        }, 840000); // 14 minutes
    }
});
