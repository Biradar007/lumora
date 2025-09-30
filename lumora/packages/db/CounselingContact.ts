import { Schema, model, models } from 'mongoose';

const CounselingContactSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    hours: { type: String },
    locationUrl: { type: String },
  },
  { timestamps: false }
);

export type CounselingContactDoc = {
  name: string;
  phone?: string;
  email?: string;
  hours?: string;
  locationUrl?: string;
};

export const CounselingContact = models.CounselingContact || model('CounselingContact', CounselingContactSchema);


