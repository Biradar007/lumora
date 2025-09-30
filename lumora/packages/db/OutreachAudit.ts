import { Schema, model, models } from 'mongoose';

const OutreachAuditSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    consent: { type: Boolean, required: true },
    payloadHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export type OutreachAuditDoc = {
  sessionId: string;
  consent: boolean;
  payloadHash: string;
  createdAt: Date;
};

export const OutreachAudit = models.OutreachAudit || model('OutreachAudit', OutreachAuditSchema);


