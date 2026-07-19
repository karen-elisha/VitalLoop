import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Simple unit tests mocking the dependencies rather than hitting the DB
describe('Auth Service Unit Tests', () => {
  const mockJwtSecret = 'test-secret';
  
  beforeAll(() => {
    process.env.JWT_SECRET = mockJwtSecret;
  });

  it('should hash passwords correctly', async () => {
    const password = 'securePassword123';
    const hash = await bcrypt.hash(password, 10);
    
    expect(hash).not.toBe(password);
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it('should generate valid JWT tokens', () => {
    const payload = { userId: '12345', role: 'individual' };
    const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
    
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, mockJwtSecret) as any;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.exp).toBeDefined();
  });
});
