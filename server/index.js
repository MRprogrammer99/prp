import express from 'express';
import { makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode-terminal';

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

// ─── Connect to WhatsApp ───
async function connectWhatsApp() {
    const authPath = path.join(__dirname, 'whatsapp_auth');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const logger = pino({ level: 'warn' }); // show warnings to debug

    let version;
    try {
        const result = await fetchLatestWaWebVersion({});
        version = result.version;
        console.log(`📌 Using WA version: ${version}`);
    } catch (e) {
        console.log('⚠️  Could not fetch WA version, using default');
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

        console.log('📋 Connection update:', JSON.stringify({ connection, hasQR: !!qr, lastDisconnect: lastDisconnect?.error?.message }));

        // QR code received — display in terminal
        if (qr) {
            qrCodeData = qr;
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║   📱  SCAN THIS QR WITH WHATSAPP      ║');
            console.log('╚════════════════════════════════════════╝\n');
            qrcode.generate(qr, { small: true });
            console.log('\nWhatsApp Business → Settings → Linked Devices → Link a Device\n');
        }

        // Connection closed
        if (connection === 'close') {
            isConnected = false;
            qrCodeData = null;

            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const msg = lastDisconnect?.error?.message || 'unknown';
            console.log(`⚠️  Disconnected: code=${statusCode}, reason="${msg}"`);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Logged out. Clearing auth...');
                const fs = await import('fs');
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                }
                console.log('🔄 Restarting in 5s...');
                setTimeout(connectWhatsApp, 5000);
            } else {
                console.log('🔄 Reconnecting in 5s...');
                setTimeout(connectWhatsApp, 5000);
            }
        }

        // Connected!
        if (connection === 'open') {
            isConnected = true;
            qrCodeData = null;
            console.log('\n✅ WhatsApp connected successfully!');
            console.log('🟢 Ready to send messages.\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// ─── API Routes ───

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', whatsapp: isConnected });
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
});
