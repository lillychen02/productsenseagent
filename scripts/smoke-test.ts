import mongoose from 'mongoose';
import { ChatSessionModel } from '../models/chatSession';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/test');
  const doc = await ChatSessionModel.create({
    sessionId: 'test123',
    messages: [
      { role: 'user', content: 'Hello Loopie', timestamp: new Date() }
    ]
  });
  console.log('Saved:', doc);
  await mongoose.disconnect();
}

test(); 