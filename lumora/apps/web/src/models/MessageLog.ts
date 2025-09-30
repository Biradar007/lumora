import { Schema, model, models } from 'mongoose';

const MessageLogSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// TTL: 30 days
MessageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type MessageLogDoc = {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export const MessageLog = models.MessageLog || model('MessageLog', MessageLogSchema);


