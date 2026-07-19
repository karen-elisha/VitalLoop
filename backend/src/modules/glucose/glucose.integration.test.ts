import request from 'supertest';
import app from '../../app';

// Mock the auth middleware so we can bypass JWT for the integration test
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'mock-user-id', role: 'individual' };
    next();
  },
  authorize: () => (req: any, res: any, next: any) => next()
}));

// Mock the DB pool
jest.mock('../../database/pool', () => ({
  query: jest.fn().mockImplementation((queryText) => {
    if (queryText.includes('SELECT COUNT(*)')) {
      return Promise.resolve({ rows: [{ count: '1' }] });
    }
    if (queryText.includes('SELECT * FROM glucose_readings')) {
      return Promise.resolve({
        rows: [
          { id: '1', value_mg_dl: 105, reading_type: 'fasting', measured_at: new Date().toISOString() }
        ],
        rowCount: 1
      });
    }
    if (queryText.includes('INSERT INTO glucose_readings')) {
      return Promise.resolve({
        rows: [{ id: '2', value_mg_dl: 120, reading_type: 'post_meal' }]
      });
    }
    return Promise.resolve({ rows: [] });
  })
}));

describe('Glucose API Integration Tests', () => {
  
  it('GET /api/glucose/readings should return mocked readings', async () => {
    const res = await request(app).get('/api/glucose/readings');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('readings');
    expect(res.body.readings).toHaveLength(1);
    expect(res.body.readings[0].value_mg_dl).toBe(105);
  });

  it('POST /api/glucose/readings should return created reading', async () => {
    const newReading = {
      valueMgDl: 120,
      readingType: 'post_meal',
      measuredAt: new Date().toISOString()
    };

    const res = await request(app)
      .post('/api/glucose/readings')
      .send(newReading);
      
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('value_mg_dl', 120);
  });
  
});
