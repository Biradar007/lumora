import { connectToDatabase, AnalyticsEvent } from '@lumora/db';
import { AnalyticsEventType } from '@lumora/core';

export class AnalyticsService {
  async trackEvent(
    sessionId: string, 
    type: AnalyticsEventType, 
    meta?: object
  ): Promise<void> {
    await connectToDatabase();
    await AnalyticsEvent.create({ sessionId, type, meta });
  }
}
