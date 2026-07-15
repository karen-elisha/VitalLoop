import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../database/pool';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

const readingSchema = z.object({
  valueMgDl: z.number().positive().max(600),
  readingType: z.enum(['fasting', 'pre_meal', 'post_meal', 'random', 'bedtime']),
  measuredAt: z.string().datetime(),
  notes: z.string().optional(),
  source: z.enum(['manual', 'cgm', 'smbg']).default('manual'),
});

// POST /api/glucose/readings
router.post('/readings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = readingSchema.parse(req.body);
    const result = await query(
      `INSERT INTO glucose_readings (user_id, value_mg_dl, reading_type, measured_at, notes, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user!.id, data.valueMgDl, data.readingType, data.measuredAt, data.notes, data.source]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Create reading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/glucose/readings
router.get('/readings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, type, limit = '50', offset = '0' } = req.query;
    
    let sql = 'SELECT * FROM glucose_readings WHERE user_id = $1';
    const params: any[] = [req.user!.id];
    let idx = 2;
    
    if (startDate) { sql += ` AND measured_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { sql += ` AND measured_at <= $${idx++}`; params.push(endDate); }
    if (type) { sql += ` AND reading_type = $${idx++}`; params.push(type); }
    
    sql += ` ORDER BY measured_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(sql, params);
    
    const countResult = await query(
      'SELECT COUNT(*) FROM glucose_readings WHERE user_id = $1',
      [req.user!.id]
    );
    
    res.json({
      readings: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get readings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/glucose/stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    
    const result = await query(
      `SELECT 
        COUNT(*) as total_readings,
        ROUND(AVG(value_mg_dl)::numeric, 1) as avg_glucose,
        MIN(value_mg_dl) as min_glucose,
        MAX(value_mg_dl) as max_glucose,
        ROUND(STDDEV(value_mg_dl)::numeric, 1) as std_dev,
        ROUND((AVG(value_mg_dl) + 46.7) / 28.7, 1) as estimated_a1c,
        ROUND(
          100.0 * COUNT(CASE WHEN value_mg_dl BETWEEN 70 AND 180 THEN 1 END) / 
          NULLIF(COUNT(*), 0), 1
        ) as time_in_range_pct
       FROM glucose_readings 
       WHERE user_id = $1 AND measured_at >= $2`,
      [req.user!.id, since]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/glucose/trends
router.get('/trends', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    
    const result = await query(
      `SELECT 
        DATE(measured_at) as date,
        ROUND(AVG(value_mg_dl)::numeric, 1) as avg_glucose,
        MIN(value_mg_dl) as min_glucose,
        MAX(value_mg_dl) as max_glucose,
        COUNT(*) as reading_count
       FROM glucose_readings 
       WHERE user_id = $1 AND measured_at >= $2
       GROUP BY DATE(measured_at)
       ORDER BY date`,
      [req.user!.id, since]
    );
    
    res.json({ trends: result.rows });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
