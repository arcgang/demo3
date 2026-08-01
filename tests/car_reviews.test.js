const request = require('supertest');
const app = require('../src/app');

describe('GET /api/cars/:id/reviews', () => {
  describe('car with reviews', () => {
    let response;

    beforeAll(async () => {
      // Seed convention: car id=1 (Toyota Camry) has reviews
      response = await request(app).get('/api/cars/1/reviews');
    });

    it('returns HTTP 200', () => {
      expect(response.status).toBe(200);
    });

    it('returns JSON content-type', () => {
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('returns an array', () => {
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('returns at least one review', () => {
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('each review has id as a number', () => {
      for (const review of response.body) {
        expect(typeof review.id).toBe('number');
      }
    });

    it('each review has reviewer_name as a string', () => {
      for (const review of response.body) {
        expect(typeof review.reviewer_name).toBe('string');
      }
    });

    it('each review has rating as a number between 1 and 5 inclusive', () => {
      for (const review of response.body) {
        expect(typeof review.rating).toBe('number');
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      }
    });

    it('each review has comment as a string or null', () => {
      for (const review of response.body) {
        expect(review.comment === null || typeof review.comment === 'string').toBe(true);
      }
    });

    it('each review has created_at as a string', () => {
      for (const review of response.body) {
        expect(typeof review.created_at).toBe('string');
        expect(review.created_at.length).toBeGreaterThan(0);
      }
    });

    it('each review has car_id matching the requested car', () => {
      for (const review of response.body) {
        expect(review.car_id).toBe(1);
      }
    });

    it('reviews are sorted newest-first (created_at descending)', () => {
      const dates = response.body.map((r) => new Date(r.created_at).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('contains only the expected top-level keys on each review', () => {
      const allowedKeys = new Set(['id', 'car_id', 'reviewer_name', 'rating', 'comment', 'created_at']);
      for (const review of response.body) {
        for (const key of Object.keys(review)) {
          expect(allowedKeys.has(key)).toBe(true);
        }
      }
    });
  });

  describe('car without reviews', () => {
    it('returns HTTP 200 with an empty array (not an error)', async () => {
      // Seed convention: a car with no reviews must exist. Use the highest seeded id
      // that has no reviews, or a car id seeded specifically without reviews.
      // We check every seeded car and find one with no reviews dynamically.
      const listRes = await request(app).get('/api/cars');
      expect(listRes.status).toBe(200);
      const noReviewCar = listRes.body.find((c) => c.review_count === 0);
      expect(noReviewCar).toBeDefined(); // seed must include at least one car with no reviews

      const res = await request(app).get(`/api/cars/${noReviewCar.id}/reviews`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('unknown car ID', () => {
    let response;

    beforeAll(async () => {
      response = await request(app).get('/api/cars/99999/reviews');
    });

    it('returns HTTP 404', () => {
      expect(response.status).toBe(404);
    });

    it('returns JSON content-type', () => {
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('returns a structured error body with an error property', () => {
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });
  });

  describe('non-numeric car ID', () => {
    it('returns HTTP 404', async () => {
      const response = await request(app).get('/api/cars/not-a-car/reviews');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('pagination — page and limit query params', () => {
    it('limit=1 returns at most 1 review', async () => {
      const response = await request(app).get('/api/cars/1/reviews?limit=1');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('page=1&limit=1 and page=2&limit=1 return different reviews when more than 1 exist', async () => {
      const page1 = await request(app).get('/api/cars/1/reviews?page=1&limit=1');
      const page2 = await request(app).get('/api/cars/1/reviews?page=2&limit=1');
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      // If there are 2+ reviews the ids must differ
      if (page1.body.length > 0 && page2.body.length > 0) {
        expect(page1.body[0].id).not.toBe(page2.body[0].id);
      }
    });

    it('page beyond available results returns an empty array (not an error)', async () => {
      const response = await request(app).get('/api/cars/1/reviews?page=99999&limit=10');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('all pages concatenated return the same reviews as no-pagination request (ordered)', async () => {
      const fullRes = await request(app).get('/api/cars/1/reviews');
      const total = fullRes.body.length;
      if (total < 2) return; // not enough data to paginate meaningfully

      const pageSize = Math.ceil(total / 2);
      const page1 = await request(app).get(`/api/cars/1/reviews?page=1&limit=${pageSize}`);
      const page2 = await request(app).get(`/api/cars/1/reviews?page=2&limit=${pageSize}`);

      const paged = [...page1.body, ...page2.body];
      expect(paged.map((r) => r.id)).toEqual(fullRes.body.map((r) => r.id));
    });

    it('non-numeric limit is rejected or falls back gracefully (200 with array)', async () => {
      const response = await request(app).get('/api/cars/1/reviews?limit=abc');
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('non-numeric page is rejected or falls back gracefully (200 with array)', async () => {
      const response = await request(app).get('/api/cars/1/reviews?page=abc');
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('review schema — full field presence required by seed conventions', () => {
    it('reviewer_name is present and not undefined on every seeded review', async () => {
      const response = await request(app).get('/api/cars/1/reviews');
      expect(response.status).toBe(200);
      for (const review of response.body) {
        expect(Object.prototype.hasOwnProperty.call(review, 'reviewer_name')).toBe(true);
      }
    });

    it('comment key is always present (null for absent values, never omitted)', async () => {
      const response = await request(app).get('/api/cars/1/reviews');
      expect(response.status).toBe(200);
      for (const review of response.body) {
        expect(Object.prototype.hasOwnProperty.call(review, 'comment')).toBe(true);
      }
    });

    it('rating is an integer', async () => {
      const response = await request(app).get('/api/cars/1/reviews');
      expect(response.status).toBe(200);
      for (const review of response.body) {
        expect(Number.isInteger(review.rating)).toBe(true);
      }
    });
  });
});
