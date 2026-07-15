import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../database/pool';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  language: z.enum(['en', 'ar']).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  heightCm: z.number().positive().optional(),
  timezone: z.string().optional(),
});

// GET /api/users/profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, role, first_name, last_name, language, date_of_birth,
              gender, height_cm, timezone, avatar_url, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const u = result.rows[0];
    res.json({
      id: u.id, email: u.email, role: u.role,
      firstName: u.first_name, lastName: u.last_name,
      language: u.language, dateOfBirth: u.date_of_birth,
      gender: u.gender, heightCm: u.height_cm,
      timezone: u.timezone, avatarUrl: u.avatar_url,
      createdAt: u.created_at, updatedAt: u.updated_at,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    
    if (data.firstName) { fields.push(`first_name = $${idx++}`); values.push(data.firstName); }
    if (data.lastName) { fields.push(`last_name = $${idx++}`); values.push(data.lastName); }
    if (data.language) { fields.push(`language = $${idx++}`); values.push(data.language); }
    if (data.dateOfBirth) { fields.push(`date_of_birth = $${idx++}`); values.push(data.dateOfBirth); }
    if (data.gender) { fields.push(`gender = $${idx++}`); values.push(data.gender); }
    if (data.heightCm) { fields.push(`height_cm = $${idx++}`); values.push(data.heightCm); }
    if (data.timezone) { fields.push(`timezone = $${idx++}`); values.push(data.timezone); }
    
    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    
    values.push(req.user!.id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, email, role, first_name, last_name, language`,
      values
    );
    
    const u = result.rows[0];
    res.json({
      id: u.id, email: u.email, role: u.role,
      firstName: u.first_name, lastName: u.last_name,
      language: u.language,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id — Provider access to patient profile
router.get('/:id', authenticate, authorize('provider', 'institution_admin', 'system'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, role, first_name, last_name, language, date_of_birth,
              gender, height_cm, timezone, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const u = result.rows[0];
    res.json({
      id: u.id, email: u.email, role: u.role,
      firstName: u.first_name, lastName: u.last_name,
      language: u.language, dateOfBirth: u.date_of_birth,
      gender: u.gender, heightCm: u.height_cm,
      timezone: u.timezone, createdAt: u.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
