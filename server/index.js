import express from 'express';
import { makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode-terminal';
import { useMongoAuthState } from './mongoAuthState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend build in production (for Render deployment)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'dist')));
}

// ─── WhatsApp State ───
let sock = null;
let isConnected = false;
let qrCodeData = null;

// ─── Auth State Setup ───
async function getAuthState() {
    const mongoUrl = process.env.MONGO_URL;

    if (mongoUrl) {
        // Use MongoDB for persistent auth (Render deployment)
        console.log('📦 Using MongoDB for persistent WhatsApp auth');
        const auth = await useMongoAuthState(mongoUrl);
        return auth; // includes { state, saveCreds, clearAll }
    } else {
        // Use filesystem for local development
        console.log('📁 Using filesystem for WhatsApp auth (local mode)');
        const authPath = path.join(__dirname, 'whatsapp_auth');
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        return { state, saveCreds, clearAll: null };
    }
}

// ─── Connect to WhatsApp ───
async function connectWhatsApp() {
    const { state, saveCreds, clearAll } = await getAuthState();
    const logger = pino({ level: 'silent' });

    let version;
    try {
        const result = await fetchLatestWaWebVersion({});
        version = result.version;
        console.log(`📌 WA version: ${version}`);
    } catch (e) {
        version = [2, 3000, 1015901307];
    }

    sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        version,
        browser: ['MoviePortal', 'Chrome', '1.0'],
        connectTimeoutMs: 60000,
        qrTimeout: 60000,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = qr;
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║   📱  SCAN THIS QR WITH WHATSAPP      ║');
            console.log('╚════════════════════════════════════════╝\n');
            qrcode.generate(qr, { small: true });
            console.log('WhatsApp Business → Settings → Linked Devices → Link a Device\n');
        }

        if (connection === 'close') {
            isConnected = false;
            qrCodeData = null;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const msg = lastDisconnect?.error?.message || 'unknown';
            console.log(`⚠️  Disconnected: code=${statusCode}, reason="${msg}"`);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Logged out. Clearing stale auth...');
                if (clearAll) await clearAll();
                console.log('🔄 Will reconnect in 10s for fresh QR...');
                setTimeout(connectWhatsApp, 10000);
            } else {
                console.log('🔄 Reconnecting in 5s...');
                setTimeout(connectWhatsApp, 5000);
            }
        }

        if (connection === 'open') {
            isConnected = true;
            qrCodeData = null;
            console.log('\n✅ WhatsApp connected successfully!');
            console.log('🟢 Ready to send messages.\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

import { MongoClient, ObjectId } from 'mongodb';

// ─── MongoDB Request Setup ───
let requestsCollection = null;
async function setupRequestsDB() {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) return;
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db('whatsapp_bot');
        requestsCollection = db.collection('movie_requests');
        console.log('📦 Connected to MongoDB for requests storage');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB for requests:', error.message);
    }
}
setupRequestsDB();

// ─── API Routes ───

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', whatsapp: isConnected });
});

// Fetch all requests (for admin)
app.get('/api/requests', async (req, res) => {
    if (!requestsCollection) return res.json([]);
    try {
        const requests = await requestsCollection.find({}).sort({ date: -1 }).toArray();
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
        const updates = req.body;
        await requestsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Track request by phone
app.get('/api/requests/track/:phone', async (req, res) => {
    if (!requestsCollection) return res.status(503).json({ error: 'DB not connected' });
    try {
        const { phone } = req.params;
        // Clean phone for searching
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const results = await requestsCollection.find({
            $or: [
                { whatsapp: phone },
                { whatsapp: cleanPhone }
            ]
        }).sort({ date: -1 }).toArray();
        res.json(results.map(r => ({ ...r, id: r._id.toString() })));
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

app.get('/api/whatsapp/status', (req, res) => {
    res.json({ connected: isConnected, hasQR: !!qrCodeData });
});

app.post('/api/whatsapp/send', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    if (!isConnected || !sock) {
        return res.status(503).json({ error: 'WhatsApp not connected. Scan QR code first.' });
    }

    try {
        let cleanNumber = phone.replace(/[^0-9]/g, '');
        if (cleanNumber.startsWith('0')) cleanNumber = cleanNumber.substring(1);
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

        const jid = cleanNumber + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });

        console.log(`📤 Sent to +${cleanNumber}`);
        res.json({ success: true, message: `Sent to +${cleanNumber}` });
    } catch (error) {
        console.error('Send failed:', error.message);
        res.status(500).json({ error: 'Send failed: ' + error.message });
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
    console.log('📡 Connecting to WhatsApp...\n');
    connectWhatsApp();

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
