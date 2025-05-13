import { Schema, model, models, Types } from 'mongoose';
import { ChatSession, ChatMessage } from '../types/index';

// Sub-schema for each ChatMessage
const ChatMessageSchema = new Schema<ChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
});

// Top-level ChatSession schema
const ChatSessionSchema = new Schema<ChatSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  messages: {
    type: [ChatMessageSchema],
    default: [],
  },
}, {
  timestamps: true,  // automatically adds createdAt + updatedAt
});

// Prevent model overwrite in Next.js hot reloading
export const ChatSessionModel = models.ChatSession || model<ChatSession>(
  'ChatSession',
  ChatSessionSchema
); 