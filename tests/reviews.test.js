const request = require('supertest');
const app = require('../src/app');

describe('POST /api/cars/:id/reviews', () => {
  const validPayload = { rating: 4, comment: 'Great car!', author: 'Alice' };

  describe('successful creation', () => {
    let response;

    beforeAll(async () => {
      response = await request(app)
        .post('/api/cars/2/reviews')
        .send(validPayload)
        .set('Content-Type', 'application/json');
    });

    it('returns HTTP 201', () => {
      expect(response.status).toBe(201);
    });

    it('returns JSON content-type', () => {
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('response body contains a review object', () => {
      expect(response.body).toHaveProperty('review');
      expect(typeof response.body.review).toBe('object');
    });

    it('review has a numeric id', () => {
      expect(typeof response.body.review.id).toBe('number');
    });

    it('review has carId matching the URL parameter', () => {
      expect(response.body.review.carId).toBe(2);
    });

    it('review has rating matching submitted payload', () => {
      expect(response.body.review.rating).toBe(validPayload.rating);
    });

    it('review has comment matching submitted payload', () => {
      expect(response.body.review.comment).toBe(validPayload.comment);
    });

    it('review has author matching submitted payload', () => {
      expect(response.body.review.author).toBe(validPayload.author);
    });

    it('response body contains car stats', () => {
      expect(response.body).toHaveProperty('car');
      expect(typeof response.body.car).toBe('object');
    });

    it('car stats include averageRating as a number', () => {
      expect(typeof response.body.car.averageRating).toBe('number');
    });

    it('car stats include reviewCount as a number', () => {
      expect(typeof response.body.car.reviewCount).toBe('number');
    });

    it('car stats reviewCount is at least 1 after insertion', () => {
      expect(response.body.car.reviewCount).toBeGreaterThanOrEqual(1);
    });

    it('car stats averageRating is rounded to 1 decimal place', () => {
      const { averageRating } = response.body.car;
      expect(Math.round(averageRating * 10)).toBe(averageRating * 10);
    });
  });

  describe('average rating is recalculated server-side', () => {
    it('averageRating reflects the newly submitted review, not a client-supplied value', async () => {
      // Post with a tampered averageRating field that should be ignored
      const res = await request(app)
        .post('/api/cars/2/reviews')
        .send({ rating: 2, comment: 'Meh', author: 'Bob', averageRating: 99, reviewCount: 999 })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      // Server must compute averageRating; 99 is nonsensical and must not appear
      expect(res.body.car.averageRating).not.toBe(99);
      expect(res.body.car.reviewCount).not.toBe(999);
    });
  });

  describe('GET /api/cars/:id reflects persisted reviews', () => {
    it('GET after POST returns updated averageRating and reviewCount', async () => {
      // Baseline
      const before = await request(app).get('/api/cars/2');
      const countBefore = before.body.reviewCount;

      // Insert a new review
      await request(app)
        .post('/api/cars/2/reviews')
        .send({ rating: 5, comment: 'Excellent!', author: 'Carol' })
        .set('Content-Type', 'application/json');

      // Fetch again
      const after = await request(app).get('/api/cars/2');
      expect(after.status).toBe(200);
      expect(after.body.reviewCount).toBe(countBefore + 1);
      expect(typeof after.body.averageRating).toBe('number');
    });
  });

  describe('validation — missing required fields', () => {
    it('returns HTTP 400 when rating is missing', async () => {
      const res = await request(app)
        .post('/api/cars/1/reviews')
        .send({ comment: 'No rating here', author: 'Dave' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns HTTP 400 when rating is out of range (0)', async () => {
      const res = await request(app)
        .post('/api/cars/1/reviews')
        .send({ rating: 0, comment: 'Too low', author: 'Eve' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns HTTP 400 when rating is out of range (6)', async () => {
      const res = await request(app)
        .post('/api/cars/1/reviews')
        .send({ rating: 6, comment: 'Too high', author: 'Eve' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns HTTP 400 when rating is not an integer', async () => {
      const res = await request(app)
        .post('/api/cars/1/reviews')
        .send({ rating: 3.5, comment: 'Half star?', author: 'Frank' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns HTTP 400 when author is missing', async () => {
      const res = await request(app)
        .post('/api/cars/1/reviews')
        .send({ rating: 3, comment: 'No author' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('unknown car ID', () => {
    it('returns HTTP 404 for a car that does not exist', async () => {
      const res = await request(app)
        .post('/api/cars/99999/reviews')
        .send(validPayload)
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns HTTP 404 for a non-numeric car ID', async () => {
      const res = await request(app)
        .post('/api/cars/not-a-car/reviews')
        .send(validPayload)
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
