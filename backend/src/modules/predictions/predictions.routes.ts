import { Router, Response } from 'express';
import { query } from '../../database/pool';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import axios from 'axios';
import config from '../../config';

const router = Router();

// POST /api/predictions/compute — Trigger risk score computation
router.post('/compute', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Gather user data for risk assessment
    const [glucoseResult, mealsResult, activityResult, breathingResult] = await Promise.all([
      query(
        `SELECT * FROM glucose_readings WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 10`,
        [req.user!.id]
      ),
      query(
        `SELECT * FROM meals WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 5`,
        [req.user!.id]
      ),
      query(
        `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1`,
        [req.user!.id]
      ),
      query(
        `SELECT COUNT(*) as count FROM breathing_sessions 
         WHERE user_id = $1 AND completion_status = 'completed' AND started_at >= NOW() - INTERVAL '7 days'`,
        [req.user!.id]
      ),
    ]);
    
    // Call AI service
    try {
      const aiResponse = await axios.post(`${config.aiService.url}/api/risk/score`, {
        userId: req.user!.id,
        glucoseReadings: glucoseResult.rows,
        recentMeals: mealsResult.rows,
        activity: activityResult.rows[0],
        breathingSessions: parseInt(breathingResult.rows[0].count),
      }, { timeout: 10000 });
      
      // Store prediction
      const prediction = aiResponse.data;
      const result = await query(
        `INSERT INTO predictions (user_id, risk_level, risk_score, factors, actions, explanation, prediction_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user!.id, prediction.riskLevel, prediction.riskScore, 
         JSON.stringify(prediction.factors), JSON.stringify(prediction.actions),
         prediction.explanation, prediction.predictionType || 'glucose_spike']
      );
      
      res.json(result.rows[0]);
    } catch (aiError) {
      // Fallback: return a basic risk assessment
      res.json({
        riskLevel: 'unknown',
        riskScore: 0,
        factors: [],
        actions: ['AI service unavailable. Please try again later.'],
        explanation: 'Risk assessment could not be completed at this time.',
      });
    }
  } catch (error) {
    console.error('Compute prediction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/predictions — Get user's predictions
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const result = await query(
      `SELECT * FROM predictions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user!.id, parseInt(limit as string)]
    );
    res.json({ predictions: result.rows });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/predictions/latest
router.get('/latest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM predictions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user!.id]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Get latest prediction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
