import { MongoClient, Db } from 'mongodb';

// Augment the NodeJS global type with our custom MongoDB client promise
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const options = {
  // useUnifiedTopology: true, // Deprecated options, no longer needed
  // useNewUrlParser: true,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) { // Check uri directly
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to maintain the connection
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new connection
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

interface ConnectToDatabaseResult {
  client: MongoClient;
  db: Db;
}

export async function connectToDatabase(): Promise<ConnectToDatabaseResult> {
  const connectedClient = await clientPromise;
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error('Please add your MONGODB_DB to .env.local');
  }
  const db = connectedClient.db(dbName);
  return { client: connectedClient, db };
} 