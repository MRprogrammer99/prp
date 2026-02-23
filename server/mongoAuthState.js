import { MongoClient, Binary } from 'mongodb';
import { proto } from '@whiskeysockets/baileys';
import { initAuthCreds } from '@whiskeysockets/baileys';

/**
 * Recursively convert MongoDB Binary objects back to Node.js Buffers.
 */
function fixBinary(data) {
    if (data instanceof Binary) {
        return data.buffer;
    }
    if (Array.isArray(data)) {
        return data.map(fixBinary);
    }
    if (typeof data === 'object' && data !== null) {
        // Handle specifically for auth state where value might be Binary
        if (data._bsontype === 'Binary') {
            return data.buffer;
        }
        for (const key in data) {
            data[key] = fixBinary(data[key]);
        }
    }
    return data;
}

/**
 * MongoDB-based auth state for Baileys.
 * Stores WhatsApp session persistently so it survives Render restarts.
 */
export async function useMongoAuthState(mongoUrl, dbName = 'whatsapp_bot') {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('📦 Connected to MongoDB for auth storage');

    const db = client.db(dbName);
    const authCollection = db.collection('auth_state');

    // Read data from MongoDB
    const readData = async (id) => {
        const doc = await authCollection.findOne({ _id: id });
        if (!doc) return null;
        return fixBinary(doc.value);
    };

    // Write data to MongoDB
    const writeData = async (id, value) => {
        await authCollection.updateOne(
            { _id: id },
            { $set: { value } },
            { upsert: true }
        );
    };

    // Remove data from MongoDB
    const removeData = async (id) => {
        await authCollection.deleteOne({ _id: id });
    };

    // Load or create credentials
    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
    }

    // Keep service awake ping (Render free tier)
    const selfPing = setInterval(async () => {
        try {
            // No-op query to keep DB and memory slightly active
            await authCollection.findOne({ _id: 'ping' });
        } catch (e) { }
    }, 600000); // 10 mins

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const value = await readData(`${type}-${id}`);
                        if (value) {
                            if (type === 'app-state-sync-key') {
                                data[id] = proto.Message.AppStateSyncKeyData.fromObject(value);
                            } else {
                                data[id] = value;
                            }
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            if (value) {
                                tasks.push(writeData(`${category}-${id}`, value));
                            } else {
                                tasks.push(removeData(`${category}-${id}`));
                            }
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: async () => {
            await writeData('creds', creds);
        },
        clearAll: async () => {
            await authCollection.deleteMany({});
            console.log('🗑️ Auth data cleared from MongoDB');
        },
        close: async () => {
            clearInterval(selfPing);
            await client.close();
        },
    };
}
