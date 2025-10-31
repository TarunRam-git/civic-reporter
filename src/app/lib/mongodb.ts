import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri: string = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Helper function to get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('civic-reporter');
}

export async function setupGeospatialIndex(): Promise<void> {
  try {
    const db = await getDatabase();
    // Create 2dsphere index for geospatial queries
    await db.collection('mapObjects').createIndex({ 'location': '2dsphere' });
    console.log('Geospatial index created');
  } catch (error) {
    console.error('Error creating geospatial index:', error);
  }
}
