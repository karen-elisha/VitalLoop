import { Router, Response } from 'express';
import { query } from '../../database/pool';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/analytics/population — Population-level analytics (institution only)
router.get('/population', authenticate, authorize('institution_admin', 'system'), async (req: AuthRequest, res: Response) => {
  try {
    const [userStats, glucoseStats, riskDistribution] = await Promise.all([
      query(`SELECT COUNT(*) as total_users, 
             COUNT(*) FILTER (WHERE role = 'individual') as patients,
             COUNT(*) FILTER (WHERE role = 'provider') as providers
             FROM users WHERE is_active = true`),
      query(`SELECT 
             ROUND(AVG(value_mg_dl)::numeric, 1) as population_avg_glucose,
             COUNT(DISTINCT user_id) as users_with_readings
             FROM glucose_readings WHERE measured_at >= NOW() - INTERVAL '30 days'`),
      query(`SELECT risk_level, COUNT(*) as count
             FROM predictions 
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY risk_level`),
    ]);
    
    res.json({
      users: userStats.rows[0],
      glucose: glucoseStats.rows[0],
      riskDistribution: riskDistribution.rows,
    });
  } catch (error) {
    console.error('Population analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/provider/patients — Provider's patient list with summaries
router.get('/provider/patients', authenticate, authorize('provider', 'institution_admin', 'system'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              (SELECT ROUND(AVG(value_mg_dl)::numeric, 1) FROM glucose_readings 
               WHERE user_id = u.id AND measured_at >= NOW() - INTERVAL '7 days') as avg_glucose_7d,
              (SELECT risk_level FROM predictions WHERE user_id = u.id 
               ORDER BY created_at DESC LIMIT 1) as latest_risk
       FROM users u
       JOIN provider_patients pp ON pp.patient_id = u.id
       WHERE pp.provider_id = $1 AND pp.status = 'active'
       ORDER BY u.last_name`,
      [req.user!.id]
    );
    
    res.json({ patients: result.rows });
  } catch (error) {
    console.error('Provider patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/summary — User's personal summary
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.query.userId || req.user!.id;
    
    // Allow providers to view patient summaries
    if (userId !== req.user!.id && !['provider', 'institution_admin', 'system'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    const [glucose, meals, breathing, weight, alerts] = await Promise.all([
      query(
        `SELECT COUNT(*) as count, ROUND(AVG(value_mg_dl)::numeric,1) as avg
         FROM glucose_readings WHERE user_id = $1 AND measured_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) as count FROM meals 
         WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) as count FROM breathing_sessions 
         WHERE user_id = $1 AND completion_status = 'completed' AND started_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      ),
      query(
        `SELECT weight_kg FROM weight_entries 
         WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) as count FROM alerts 
         WHERE user_id = $1 AND read = false`,
        [userId]
      ),
    ]);
    
    res.json({
      period: '7 days',
      glucose: {
        readingsCount: parseInt(glucose.rows[0].count),
        average: glucose.rows[0].avg ? parseFloat(glucose.rows[0].avg) : null,
      },
      meals: { count: parseInt(meals.rows[0].count) },
      breathing: { completedSessions: parseInt(breathing.rows[0].count) },
      weight: { latest: weight.rows[0]?.weight_kg || null },
      alerts: { unread: parseInt(alerts.rows[0].count) },
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
