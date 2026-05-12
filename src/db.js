const { MongoClient } = require('mongodb');

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'articulos';
const collectionName = process.env.CollectionName || 'pendientes';

let db;
let collection;
let usersCollection;
let linksCollection;

async function connectDB() {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    collection = db.collection(collectionName);
    usersCollection = db.collection('users');
    linksCollection = db.collection('links');

    await collection.createIndex(
        { title: 'text', content: 'text', url: 'text', tags: 'text' }
    ).catch((err) => {
        if (err.code !== 85) throw err;
    });
    await collection.createIndex({ date: -1 });
    await collection.createIndex({ tags: 1 });

    await linksCollection.createIndex({ notionId: 1 }, { unique: true, sparse: true }).catch((err) => {
        if (err.code !== 85) throw err;
    });
    await linksCollection.createIndex({ tags: 1 });
    await linksCollection.createIndex({ viewedAt: -1 });

    console.log('✅ Conectado a MongoDB');
}

function getDB() { return db; }
function getCollection() { return collection; }
function getUsersCollection() { return usersCollection; }
function getLinksCollection() { return linksCollection; }

module.exports = {
    connectDB,
    getDB,
    getCollection,
    getUsersCollection,
    getLinksCollection,
};
