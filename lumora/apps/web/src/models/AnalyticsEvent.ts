import { Schema, model, models } from 'mongoose';

const AnalyticsEventSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// TTL: 30 days
AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type AnalyticsEventDoc = {
  sessionId: string;
  type: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
};

export const AnalyticsEvent = models.AnalyticsEvent || model('AnalyticsEvent', AnalyticsEventSchema);


