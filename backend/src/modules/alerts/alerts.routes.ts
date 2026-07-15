import { Router, Response } from 'express';
import { query } from '../../database/pool';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/alerts — Get user's alerts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { unreadOnly, limit = '20', offset = '0' } = req.query;
    
    let sql = 'SELECT * FROM alerts WHERE user_id = $1';
    const params: any[] = [req.user!.id];
    let idx = 2;
    
    if (unreadOnly === 'true') {
      sql += ` AND read = false`;
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(sql, params);
    
    const unreadCount = await query(
      'SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND read = false',
      [req.user!.id]
    );
    
    res.json({
      alerts: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/alerts/:id/read — Mark alert as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE alerts SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user!.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/alerts/read-all — Mark all alerts as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      'UPDATE alerts SET read = true WHERE user_id = $1 AND read = false',
      [req.user!.id]
    );
    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
