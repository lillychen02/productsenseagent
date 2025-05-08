// scripts/simple-mongodb-test.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient } from 'mongodb';

async function testMongoConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connection successful!');
    
    const db = client.db(process.env.MONGODB_DB || 'interview-app');
    console.log(`Using database: ${db.databaseName}`);
    
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

testMongoConnection(); 