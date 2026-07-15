import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../database/pool';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

const sessionSchema = z.object({
  sessionType: z.enum(['paced', 'box', 'post_meal', 'sleep_prep']),
  durationSeconds: z.number().int().positive().max(3600),
});

// POST /api/breathing/sessions — Start a breathing session
router.post('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = sessionSchema.parse(req.body);
    
    const result = await query(
      `INSERT INTO breathing_sessions (user_id, session_type, duration_seconds, started_at, completion_status)
       VALUES ($1, $2, $3, NOW(), 'in_progress')
       RETURNING *`,
      [req.user!.id, data.sessionType, data.durationSeconds]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/breathing/sessions/:id/complete
router.put('/sessions/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'completed' } = req.body;
    
    const result = await query(
      `UPDATE breathing_sessions 
       SET completed_at = NOW(), completion_status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/breathing/sessions
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '20', offset = '0', type } = req.query;
    
    let sql = 'SELECT * FROM breathing_sessions WHERE user_id = $1';
    const params: any[] = [req.user!.id];
    let idx = 2;
    
    if (type) { sql += ` AND session_type = $${idx++}`; params.push(type); }
    
    sql += ` ORDER BY started_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(sql, params);
    
    const countResult = await query(
      'SELECT COUNT(*) FROM breathing_sessions WHERE user_id = $1 AND completion_status = $2',
      [req.user!.id, 'completed']
    );
    
    res.json({
      sessions: result.rows,
      totalCompleted: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/breathing/sessions/stats
router.get('/sessions/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE completion_status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE completion_status = 'completed' AND started_at >= NOW() - INTERVAL '7 days') as this_week,
        COUNT(*) FILTER (WHERE completion_status = 'completed' AND started_at >= NOW() - INTERVAL '30 days') as this_month,
        COALESCE(SUM(duration_seconds) FILTER (WHERE completion_status = 'completed'), 0) as total_seconds,
        COUNT(DISTINCT DATE(started_at)) FILTER (WHERE completion_status = 'completed' AND started_at >= NOW() - INTERVAL '7 days') as streak_days,
        json_agg(DISTINCT session_type) FILTER (WHERE completion_status = 'completed') as types_practiced
       FROM breathing_sessions 
       WHERE user_id = $1`,
      [req.user!.id]
    );
    
    const stats = result.rows[0];
    res.json({
      totalCompleted: parseInt(stats.total_completed),
      thisWeek: parseInt(stats.this_week),
      thisMonth: parseInt(stats.this_month),
      totalMinutes: Math.round(parseInt(stats.total_seconds) / 60),
      streakDays: parseInt(stats.streak_days),
      typesPracticed: stats.types_practiced || [],
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
