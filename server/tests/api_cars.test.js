const request = require('supertest');
const app = require('../app');

describe('GET /api/cars', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/cars');
    expect(res.status).toBe(200);
  });

  it('returns a JSON array', async () => {
    const res = await request(app).get('/api/cars');
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('contains at least 3 cars', async () => {
    const res = await request(app).get('/api/cars');
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('each car has the required fields with correct types', async () => {
    const res = await request(app).get('/api/cars');
    for (const car of res.body) {
      expect(typeof car.id).toBe('number');
      expect(typeof car.make).toBe('string');
      expect(typeof car.model).toBe('string');
      expect(typeof car.year).toBe('number');
      // thumbnail_url may be a string or null
      expect(car.thumbnail_url === null || typeof car.thumbnail_url === 'string').toBe(true);
      // review_count must be a non-negative integer
      expect(Number.isInteger(car.review_count)).toBe(true);
      expect(car.review_count).toBeGreaterThanOrEqual(0);
      // avg_rating must be null or a finite number
      expect(car.avg_rating === null || typeof car.avg_rating === 'number').toBe(true);
    }
  });

  it('cars with zero reviews have avg_rating: null and review_count: 0', async () => {
    const res = await request(app).get('/api/cars');
    const zeroReviewCars = res.body.filter((c) => c.review_count === 0);
    expect(zeroReviewCars.length).toBeGreaterThanOrEqual(1);
    for (const car of zeroReviewCars) {
      expect(car.avg_rating).toBeNull();
    }
  });

  it('cars with reviews have a numeric avg_rating and correct review_count', async () => {
    const res = await request(app).get('/api/cars');
    const reviewedCars = res.body.filter((c) => c.review_count > 0);
    expect(reviewedCars.length).toBeGreaterThanOrEqual(1);
    for (const car of reviewedCars) {
      expect(typeof car.avg_rating).toBe('number');
      expect(Number.isFinite(car.avg_rating)).toBe(true);
    }
  });

  it('avg_rating is properly rounded (at most 2 decimal places)', async () => {
    const res = await request(app).get('/api/cars');
    for (const car of res.body.filter((c) => c.avg_rating !== null)) {
      const rounded = Math.round(car.avg_rating * 100) / 100;
      expect(car.avg_rating).toBeCloseTo(rounded, 5);
    }
  });

  it('avg_rating values are within a valid rating range (1-5)', async () => {
    const res = await request(app).get('/api/cars');
    for (const car of res.body.filter((c) => c.avg_rating !== null)) {
      expect(car.avg_rating).toBeGreaterThanOrEqual(1);
      expect(car.avg_rating).toBeLessThanOrEqual(5);
    }
  });

  it('returns Content-Type application/json', async () => {
    const res = await request(app).get('/api/cars');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('no extra unexpected top-level keys on each car object', async () => {
    const allowedKeys = new Set(['id', 'make', 'model', 'year', 'thumbnail_url', 'avg_rating', 'review_count']);
    const res = await request(app).get('/api/cars');
    for (const car of res.body) {
      for (const key of Object.keys(car)) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    }
  });
});
