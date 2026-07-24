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
    if (queryText.includes('INSERT INTO breathing_sessions')) {
      return Promise.resolve({
        rows: [{ id: 'breath-1', session_type: 'box', duration_seconds: 300 }]
      });
    }
    if (queryText.includes('SELECT')) {
      return Promise.resolve({
        rows: [
          { id: 'breath-1', session_type: 'box', duration_seconds: 300, completed_at: new Date().toISOString() }
        ],
        rowCount: 1
      });
    }
    return Promise.resolve({ rows: [] });
  })
}));

describe('Breathing API Integration Tests', () => {
  it('GET /api/breathing/sessions should return breathing sessions', async () => {
    const res = await request(app).get('/api/breathing/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessions');
  });

  it('POST /api/breathing/sessions should log completed session', async () => {
    const payload = {
      sessionType: 'box',
      durationSeconds: 300,
      heartRateBefore: 78,
      heartRateAfter: 70
    };

    const res = await request(app)
      .post('/api/breathing/sessions')
      .send(payload);

    expect(res.status).toBe(201);
  });
});
