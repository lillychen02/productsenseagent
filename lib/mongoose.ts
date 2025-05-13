import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB; // Get the DB name from env

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

if (!MONGODB_DB_NAME) { // Add check for DB name
  console.warn(
    'MONGODB_DB environment variable is not set. Mongoose might connect to a default database. Please define it in .env.local for clarity.'
  );
  // You could choose to throw an error here if MONGODB_DB_NAME is critical
  // throw new Error('Please define the MONGODB_DB environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the NodeJS Global type with the mongoose cache
declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function connectMongoose(): Promise<typeof mongoose> {
  if (cached.conn) {
    // console.log('Using cached Mongoose connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable buffering (recommended)
      dbName: MONGODB_DB_NAME, // Explicitly set the database name here
    };

    console.log(`Creating new Mongoose connection to URI: [${MONGODB_URI}] with dbName: [${MONGODB_DB_NAME || 'Not Specified in Env, Mongoose Default'}]...`);
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
        // Robustly log connected DB name
        const dbName = mongooseInstance?.connection?.db?.databaseName;
        if (dbName) {
            console.log(`Mongoose connection successful. Connected to DB: ${dbName}`);
        } else {
            console.log('Mongoose connection appears successful, but could not retrieve DB name directly from instance. Check readyState.');
        }
        console.log(`Mongoose readyState after connect: ${mongooseInstance?.connection?.readyState}`);
        return mongooseInstance;
    }).catch(error => {
        console.error('Mongoose connection error:', error);
        cached.promise = null; // Reset promise on error
        throw error; // Re-throw error
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectMongoose; 