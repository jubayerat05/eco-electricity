import { Request, Response } from 'express';
import { AIInsightsAnalyzer } from '../../services/aiInsights/analyzer';

export class AIInsightsController {
  constructor(private analyzer: AIInsightsAnalyzer) {}

  getInsights = async (req: Request, res: Response): Promise<void> => {
    try {
      const insights = await this.analyzer.calculateInsights();
      res.json(insights);
    } catch (error) {
      console.error('[AI Controller] Failed to get latest insights:', error);
      res.status(500).json({ error: 'Failed to retrieve energy insights' });
    }
  };
}
