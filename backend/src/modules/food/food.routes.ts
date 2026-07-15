import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../database/pool';
import { authenticate, AuthRequest } from '../../middleware/auth';
import axios from 'axios';
import config from '../../config';

const router = Router();

const mealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  loggedAt: z.string().datetime(),
  notes: z.string().optional(),
  items: z.array(z.object({
    foodId: z.string().uuid().optional(),
    foodName: z.string().min(1),
    portionGrams: z.number().positive(),
    calories: z.number().optional(),
    carbsG: z.number().optional(),
    proteinG: z.number().optional(),
    fatG: z.number().optional(),
    fiberG: z.number().optional(),
    giIndex: z.number().optional(),
  })).min(1),
});

// POST /api/food/meals — Log a meal
router.post('/meals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = mealSchema.parse(req.body);
    
    // Calculate totals
    const totals = data.items.reduce((acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      carbs: acc.carbs + (item.carbsG || 0),
      protein: acc.protein + (item.proteinG || 0),
      fat: acc.fat + (item.fatG || 0),
      fiber: acc.fiber + (item.fiberG || 0),
    }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 });
    
    // Create meal
    const mealResult = await query(
      `INSERT INTO meals (user_id, meal_type, logged_at, total_calories, total_carbs_g, total_protein_g, total_fat_g, total_fiber_g, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user!.id, data.mealType, data.loggedAt, totals.calories, totals.carbs, totals.protein, totals.fat, totals.fiber, data.notes]
    );
    
    const meal = mealResult.rows[0];
    
    // Insert meal items
    for (const item of data.items) {
      await query(
        `INSERT INTO meal_items (meal_id, food_id, food_name, portion_grams, calories, carbs_g, protein_g, fat_g, fiber_g, gi_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [meal.id, item.foodId, item.foodName, item.portionGrams, item.calories, item.carbsG, item.proteinG, item.fatG, item.fiberG, item.giIndex]
      );
    }
    
    // Call AI service for meal analysis (async, non-blocking)
    try {
      const aiResponse = await axios.post(`${config.aiService.url}/api/food/analyze`, {
        userId: req.user!.id,
        mealType: data.mealType,
        items: data.items,
        totals,
      }, { timeout: 5000 });
      
      // Store AI analysis
      await query(
        'UPDATE meals SET ai_analysis = $1 WHERE id = $2',
        [JSON.stringify(aiResponse.data), meal.id]
      );
      
      meal.ai_analysis = aiResponse.data;
    } catch (aiError) {
      // AI service unavailable — continue without analysis
      console.warn('AI service unavailable for meal analysis');
    }
    
    res.status(201).json(meal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Create meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/food/meals
router.get('/meals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, mealType, limit = '50', offset = '0' } = req.query;
    
    let sql = `SELECT m.*, json_agg(mi.*) as items 
               FROM meals m 
               LEFT JOIN meal_items mi ON mi.meal_id = m.id 
               WHERE m.user_id = $1`;
    const params: any[] = [req.user!.id];
    let idx = 2;
    
    if (startDate) { sql += ` AND m.logged_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { sql += ` AND m.logged_at <= $${idx++}`; params.push(endDate); }
    if (mealType) { sql += ` AND m.meal_type = $${idx++}`; params.push(mealType); }
    
    sql += ` GROUP BY m.id ORDER BY m.logged_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await query(sql, params);
    res.json({ meals: result.rows });
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/food/search — Search food database
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit = '20' } = req.query;
    
    if (!q || (q as string).length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }
    
    const result = await query(
      `SELECT * FROM food_database 
       WHERE name ILIKE $1 OR name_ar ILIKE $1 OR category ILIKE $1
       ORDER BY name LIMIT $2`,
      [`%${q}%`, parseInt(limit as string)]
    );
    
    res.json({ foods: result.rows });
  } catch (error) {
    console.error('Search food error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/food/triggers — Get glucose trigger patterns
router.get('/triggers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Find meals that correlate with high post-meal glucose readings
    const result = await query(
      `SELECT 
        mi.food_name,
        COUNT(*) as occurrence_count,
        ROUND(AVG(gr.value_mg_dl)::numeric, 1) as avg_post_meal_glucose,
        MAX(gr.value_mg_dl) as max_post_meal_glucose
       FROM meals m
       JOIN meal_items mi ON mi.meal_id = m.id
       JOIN glucose_readings gr ON gr.user_id = m.user_id 
         AND gr.reading_type = 'post_meal'
         AND gr.measured_at BETWEEN m.logged_at AND m.logged_at + INTERVAL '3 hours'
       WHERE m.user_id = $1
       GROUP BY mi.food_name
       HAVING AVG(gr.value_mg_dl) > 140
       ORDER BY avg_post_meal_glucose DESC
       LIMIT 10`,
      [req.user!.id]
    );
    
    res.json({ triggers: result.rows });
  } catch (error) {
    console.error('Get triggers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
