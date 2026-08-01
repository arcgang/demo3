const request = require('supertest');
const app = require('../src/app');

describe('GET /api/cars/:id', () => {
  describe('valid car ID', () => {
    let response;
    let carId;

    beforeAll(async () => {
      // Discover a seeded car ID by convention (seed uses id=1)
      carId = 1;
      response = await request(app).get(`/api/cars/${carId}`);
    });

    it('returns HTTP 200', () => {
      expect(response.status).toBe(200);
    });

    it('returns JSON content-type', () => {
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('includes id field', () => {
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('number');
    });

    it('includes make field', () => {
      expect(response.body).toHaveProperty('make');
      expect(typeof response.body.make).toBe('string');
      expect(response.body.make.length).toBeGreaterThan(0);
    });

    it('includes model field', () => {
      expect(response.body).toHaveProperty('model');
      expect(typeof response.body.model).toBe('string');
      expect(response.body.model.length).toBeGreaterThan(0);
    });

    it('includes year field', () => {
      expect(response.body).toHaveProperty('year');
      expect(typeof response.body.year).toBe('number');
    });

    it('includes description field', () => {
      expect(response.body).toHaveProperty('description');
      expect(typeof response.body.description).toBe('string');
    });

    it('includes averageRating field', () => {
      expect(response.body).toHaveProperty('averageRating');
    });

    it('includes reviewCount field', () => {
      expect(response.body).toHaveProperty('reviewCount');
      expect(typeof response.body.reviewCount).toBe('number');
    });
  });

  describe('car with reviews', () => {
    // Seed ensures car id=1 has at least one review
    it('returns averageRating as a number rounded to 1 decimal place', async () => {
      const response = await request(app).get('/api/cars/1');
      expect(response.status).toBe(200);
      const { averageRating } = response.body;
      expect(typeof averageRating).toBe('number');
      // 1 decimal precision: multiplying by 10 and rounding gives an integer
      expect(Math.round(averageRating * 10)).toBe(averageRating * 10);
    });

    it('returns reviewCount matching actual seeded reviews', async () => {
      const response = await request(app).get('/api/cars/1');
      expect(response.status).toBe(200);
      expect(response.body.reviewCount).toBeGreaterThan(0);
    });
  });

  describe('car without reviews', () => {
    // Seed ensures car id=2 has no reviews attached
    it('returns averageRating as null when no reviews exist', async () => {
      const response = await request(app).get('/api/cars/2');
      expect(response.status).toBe(200);
      expect(response.body.averageRating).toBeNull();
    });

    it('returns reviewCount of 0 when no reviews exist', async () => {
      const response = await request(app).get('/api/cars/2');
      expect(response.status).toBe(200);
      expect(response.body.reviewCount).toBe(0);
    });
  });

  describe('unknown car ID', () => {
    let response;

    beforeAll(async () => {
      response = await request(app).get('/api/cars/99999');
    });

    it('returns HTTP 404', () => {
      expect(response.status).toBe(404);
    });

    it('returns JSON content-type', () => {
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('returns a structured error body with an error property', () => {
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('does not return car fields', () => {
      expect(response.body).not.toHaveProperty('make');
      expect(response.body).not.toHaveProperty('model');
      expect(response.body).not.toHaveProperty('year');
    });
  });

  describe('non-numeric car ID', () => {
    it('returns HTTP 404 for a string ID that matches no car', async () => {
      const response = await request(app).get('/api/cars/not-a-car');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
