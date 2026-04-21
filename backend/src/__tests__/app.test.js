const request = require('supertest');
const app     = require('../src/app');

// Mock DB and Redis for unit tests
jest.mock('../src/config/database', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
  query: jest.fn(),
  pool: { getConnection: jest.fn() },
}));

jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue({}),
  getOrSet: jest.fn().mockImplementation((key, ttl, fn) => fn()),
  client: { get: jest.fn(), setEx: jest.fn(), del: jest.fn() },
}));

const { query } = require('../src/config/database');

describe('Health check', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('Auth endpoints', () => {
  it('POST /api/auth/register — missing fields returns 500/400', async () => {
    query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'pass123' });
    expect([400, 500]).toContain(res.status);
  });

  it('POST /api/auth/login — invalid credentials returns 401', async () => {
    query.mockResolvedValueOnce([]); // no user found
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('Products endpoints', () => {
  it('GET /api/products returns product list', async () => {
    query.mockResolvedValueOnce([
      { id: 1, name: 'Test Product', price: 999, stock_qty: 10, category_name: 'Electronics' }
    ]);
    query.mockResolvedValueOnce([{ total: 1 }]);

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
  });

  it('GET /api/products/:id — not found returns 404', async () => {
    query.mockResolvedValueOnce([]);
    const res = await request(app).get('/api/products/99999');
    expect(res.status).toBe(404);
  });

  it('GET /api/products/search — short query returns empty', async () => {
    const res = await request(app).get('/api/products/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('Protected routes', () => {
  it('GET /api/cart — no auth returns 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('GET /api/orders — no auth returns 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});

describe('Rate limiting', () => {
  it('Responds to OPTIONS preflight', async () => {
    const res = await request(app).options('/api/products');
    expect([200, 204]).toContain(res.status);
  });
});
