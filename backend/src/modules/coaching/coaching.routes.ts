import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../../database/pool';
import { authenticate, AuthRequest } from '../../middleware/auth';
import axios from 'axios';
import config from '../../config';

const router = Router();

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

// POST /api/coaching/chat — Send a message to AI coach
router.post('/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = messageSchema.parse(req.body);
    
    let conversationId = data.conversationId;
    
    // Create new conversation if needed
    if (!conversationId) {
      const convResult = await query(
        `INSERT INTO coaching_conversations (user_id, title)
         VALUES ($1, $2)
         RETURNING id`,
        [req.user!.id, data.content.substring(0, 50)]
      );
      conversationId = convResult.rows[0].id;
    }
    
    // Store user message
    await query(
      `INSERT INTO coaching_messages (conversation_id, role, content)
       VALUES ($1, 'user', $2)`,
      [conversationId, data.content]
    );
    
    // Get conversation history
    const historyResult = await query(
      `SELECT role, content FROM coaching_messages 
       WHERE conversation_id = $1 ORDER BY created_at LIMIT 20`,
      [conversationId]
    );
    
    // Get user context for AI
    const glucoseResult = await query(
      `SELECT value_mg_dl, reading_type, measured_at FROM glucose_readings 
       WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 8`,
      [req.user!.id]
    );

    const mealsResult = await query(
      `SELECT meal_type, logged_at, total_calories, total_carbs_g, total_protein_g
       FROM meals WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 5`,
      [req.user!.id]
    );

    const weightResult = await query(
      `SELECT weight_kg, measured_at FROM weight_entries WHERE user_id = $1 ORDER BY measured_at DESC LIMIT 5`,
      [req.user!.id]
    );

    const breathingResult = await query(
      `SELECT session_type, duration_seconds, completion_status, started_at
       FROM breathing_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 5`,
      [req.user!.id]
    );

    const predictionResult = await query(
      `SELECT risk_level, risk_score, explanation, created_at
       FROM predictions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user!.id]
    );
    
    let assistantMessage = '';
    
    try {
      const aiResponse = await axios.post(`${config.aiService.url}/api/coaching/chat`, {
        userId: req.user!.id,
        message: data.content,
        history: historyResult.rows,
        context: {
          recentGlucose: glucoseResult.rows,
          recentMeals: mealsResult.rows,
          recentWeight: weightResult.rows,
          recentBreathing: breathingResult.rows,
          latestPrediction: predictionResult.rows,
        },
      }, { timeout: 30000 });
      
      assistantMessage = aiResponse.data.response;
    } catch (aiError) {
      // Fallback rule-based response
      assistantMessage = generateFallbackResponse(data.content);
    }
    
    // Store assistant response
    await query(
      `INSERT INTO coaching_messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)`,
      [conversationId, assistantMessage]
    );
    
    // Update conversation timestamp
    await query(
      `UPDATE coaching_conversations SET last_message_at = NOW() WHERE id = $1`,
      [conversationId]
    );
    
    res.json({
      conversationId,
      response: assistantMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/coaching/conversations — List conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM coaching_conversations 
       WHERE user_id = $1 ORDER BY last_message_at DESC LIMIT 20`,
      [req.user!.id]
    );
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/coaching/conversations/:id/messages
router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Verify conversation belongs to user
    const convResult = await query(
      `SELECT id FROM coaching_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );
    
    if (convResult.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    const result = await query(
      `SELECT * FROM coaching_messages 
       WHERE conversation_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('glucose') || lower.includes('sugar') || lower.includes('blood')) {
    return "Monitoring your blood glucose regularly is great! For fasting glucose, aim for 70-100 mg/dL. Post-meal readings should ideally be under 140 mg/dL within 2 hours. Would you like to discuss strategies for managing your levels?";
  }
  if (lower.includes('food') || lower.includes('eat') || lower.includes('meal') || lower.includes('diet')) {
    return "A balanced diet is key to managing your health! Focus on whole grains, lean proteins, plenty of vegetables, and healthy fats. Try to limit refined carbohydrates and sugary foods. Would you like specific meal suggestions?";
  }
  if (lower.includes('breath') || lower.includes('stress') || lower.includes('relax')) {
    return "Breathing exercises can significantly reduce stress and may help with blood glucose management. I'd recommend trying a 5-minute box breathing session — breathe in for 4 seconds, hold for 4, out for 4, hold for 4. Would you like to start a guided session?";
  }
  if (lower.includes('weight') || lower.includes('exercise') || lower.includes('activity')) {
    return "Physical activity is incredibly beneficial! Even a 15-minute walk after meals can help reduce post-meal glucose spikes by up to 30%. Aim for at least 150 minutes of moderate activity per week. What types of exercise do you enjoy?";
  }
  
  return "I'm your VitalLoop health coach! I can help you with glucose management, nutrition advice, breathing exercises, weight management, and general health guidance. What would you like to discuss today?";
}

export default router;
