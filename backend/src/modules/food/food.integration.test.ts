import request from 'supertest';
import app from '../../app';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'mock-user-id', role: 'individual' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

jest.mock('../../database/pool', () => ({
  query: jest.fn().mockImplementation((queryText) => {
    if (queryText.includes('INSERT INTO meals')) {
      return Promise.resolve({
        rows: [{ id: 'meal-1', meal_type: 'lunch', total_calories: 450, total_carbs_g: 50 }]
      });
    }
    if (queryText.includes('INSERT INTO meal_items')) {
      return Promise.resolve({
        rows: [{ id: 'item-1', food_name: 'Oats & Berries' }]
      });
    }
    if (queryText.includes('SELECT')) {
      return Promise.resolve({
        rows: [
          { id: 'meal-1', meal_type: 'lunch', total_calories: 450, total_carbs_g: 50, logged_at: new Date().toISOString() }
        ],
        rowCount: 1
      });
    }
    return Promise.resolve({ rows: [] });
  })
}));

describe('Food API Integration Tests', () => {
  it('GET /api/food/meals should return list of meals', async () => {
    const res = await request(app).get('/api/food/meals');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('meals');
  });

  it('POST /api/food/meals should log a new meal', async () => {
    const payload = {
      mealType: 'lunch',
      loggedAt: new Date().toISOString(),
      items: [{ foodName: 'Oats & Berries', portionGrams: 200, carbsG: 40, proteinG: 10, fatG: 5, calories: 240 }]
    };

    const res = await request(app)
      .post('/api/food/meals')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'meal-1');
  });
});
