import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../database/pool';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

const weightSchema = z.object({
  weightKg: z.number().positive().max(500),
  measuredAt: z.string().datetime(),
  notes: z.string().optional(),
});

// POST /api/weight/entries
router.post('/entries', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = weightSchema.parse(req.body);
    const result = await query(
      `INSERT INTO weight_entries (user_id, weight_kg, measured_at, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user!.id, data.weightKg, data.measuredAt, data.notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Create weight entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/weight/entries
router.get('/entries', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, limit = '100', offset = '0' } = req.query;
    
    let sql = 'SELECT * FROM weight_entries WHERE user_id = $1';
    const params: any[] = [req.user!.id];
    let idx = 2;
    
    if (startDate) { sql += ` AND measured_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { sql += ` AND measured_at <= $${idx++}`; params.push(endDate); }
    
    sql += ` ORDER BY measured_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(sql, params);
    res.json({ entries: result.rows });
  } catch (error) {
    console.error('Get weight entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/weight/trends
router.get('/trends', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '90' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    
    const result = await query(
      `SELECT 
        DATE(measured_at) as date,
        ROUND(AVG(weight_kg)::numeric, 2) as avg_weight
       FROM weight_entries 
       WHERE user_id = $1 AND measured_at >= $2
       GROUP BY DATE(measured_at)
       ORDER BY date`,
      [req.user!.id, since]
    );
    
    // Calculate trend
    const entries = result.rows;
    let trend = 'stable';
    if (entries.length >= 2) {
      const first = parseFloat(entries[0].avg_weight);
      const last = parseFloat(entries[entries.length - 1].avg_weight);
      const diff = last - first;
      if (diff > 0.5) trend = 'gaining';
      else if (diff < -0.5) trend = 'losing';
    }
    
    res.json({ trends: entries, trend });
  } catch (error) {
    console.error('Get weight trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
