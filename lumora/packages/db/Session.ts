import { Schema, model, models } from 'mongoose';

const SessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export type SessionDoc = {
  sessionId: string;
  createdAt: Date;
  lastActiveAt: Date;
};

export const Session = models.Session || model('Session', SessionSchema);


