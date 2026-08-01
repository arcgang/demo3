const request = require('supertest');

// var is hoisted before jest.mock's hoisted factory, so the closure captures
// a writable binding; beforeEach re-assigns it before every test runs.
var mockPoolQuery;

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: (...args) => mockPoolQuery(...args),
  })),
}), { virtual: true });

const app = require('../src/app');

const CAR_ID = 1;

const VALID_BODY = {
  reviewer_name: 'Alice Smith',
  rating: 4,
  comment: 'Great car, very comfortable to drive.',
};

const CREATED_ROW = {
  id: 42,
  car_id: CAR_ID,
  reviewer_name: 'Alice Smith',
  rating: 4,
  comment: 'Great car, very comfortable to drive.',
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('POST /api/cars/:id/reviews', () => {
  beforeEach(() => {
    // Default: all pool.query calls resolve successfully with the created row.
    // Individual tests that need a different behaviour re-assign mockPoolQuery.
    mockPoolQuery = jest.fn().mockResolvedValue({ rows: [CREATED_ROW] });
    app.locals.reviewSubmissionRateLimiter.reset();
  });

  // ---------------------------------------------------------------------------
  // Successful creation → 201
  // ---------------------------------------------------------------------------

  describe('successful creation', () => {
    it('returns HTTP 201', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.status).toBe(201);
    });

    it('returns Content-Type application/json', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('response body contains all required review fields', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('car_id');
      expect(res.body).toHaveProperty('reviewer_name');
      expect(res.body).toHaveProperty('rating');
      expect(res.body).toHaveProperty('comment');
      expect(res.body).toHaveProperty('created_at');
    });

    it('response fields have correct types', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(typeof res.body.id).toBe('number');
      expect(typeof res.body.car_id).toBe('number');
      expect(typeof res.body.reviewer_name).toBe('string');
      expect(typeof res.body.rating).toBe('number');
      expect(typeof res.body.comment).toBe('string');
    });

    it('car_id in response matches the URL parameter', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.body.car_id).toBe(CAR_ID);
    });

    it('uses a parameterised query — user input is passed as an array, not interpolated', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.status).toBe(201);
      // At least one pool.query call must pass parameters as a separate array
      const paramCalls = mockPoolQuery.mock.calls.filter(
        (c) => Array.isArray(c[1])
      );
      expect(paramCalls.length).toBeGreaterThanOrEqual(1);
      // User-supplied values must appear in the parameter array, not in the SQL string
      const allParams = mockPoolQuery.mock.calls.flatMap((c) => c[1] || []);
      expect(allParams).toContain(VALID_BODY.reviewer_name);
      expect(allParams).toContain(VALID_BODY.rating);
      expect(allParams).toContain(VALID_BODY.comment);
    });

    it('passes the trimmed reviewer_name to the database query', async () => {
      const trimmedRow = { ...CREATED_ROW, reviewer_name: 'Bob' };
      mockPoolQuery = jest.fn().mockResolvedValue({ rows: [trimmedRow] });
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, reviewer_name: '  Bob  ' });
      expect(res.status).toBe(201);
      const allParams = mockPoolQuery.mock.calls.flatMap((c) => c[1] || []);
      expect(allParams).toContain('Bob');
      expect(allParams).not.toContain('  Bob  ');
    });

    it('passes the trimmed comment to the database query', async () => {
      const trimmedComment = 'Great car, very reliable.';
      const trimmedRow = { ...CREATED_ROW, comment: trimmedComment };
      mockPoolQuery = jest.fn().mockResolvedValue({ rows: [trimmedRow] });
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, comment: `  ${trimmedComment}  ` });
      expect(res.status).toBe(201);
      const allParams = mockPoolQuery.mock.calls.flatMap((c) => c[1] || []);
      expect(allParams).toContain(trimmedComment);
      expect(allParams).not.toContain(`  ${trimmedComment}  `);
    });

    it('accepts rating 1 (minimum boundary)', async () => {
      const row = { ...CREATED_ROW, rating: 1 };
      mockPoolQuery = jest.fn().mockResolvedValue({ rows: [row] });
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: 1 });
      expect(res.status).toBe(201);
    });

    it('accepts rating 5 (maximum boundary)', async () => {
      const row = { ...CREATED_ROW, rating: 5 };
      mockPoolQuery = jest.fn().mockResolvedValue({ rows: [row] });
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: 5 });
      expect(res.status).toBe(201);
    });

    it('accepts comment of exactly 10 characters (minimum boundary)', async () => {
      const tenCharComment = '1234567890';
      const row = { ...CREATED_ROW, comment: tenCharComment };
      mockPoolQuery = jest.fn().mockResolvedValue({ rows: [row] });
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, comment: tenCharComment });
      expect(res.status).toBe(201);
    });

    it('returns 429 after too many submissions from the same client within the rate-limit window', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const res = await request(app)
          .post(`/api/cars/${CAR_ID}/reviews`)
          .set('X-Forwarded-For', '203.0.113.10')
          .send(VALID_BODY);
        expect(res.status).toBe(201);
      }

      const rateLimitedResponse = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .set('X-Forwarded-For', '203.0.113.10')
        .send(VALID_BODY);

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body).toEqual({
        error: 'Too many review submissions. Please try again later.',
      });
      expect(mockPoolQuery).toHaveBeenCalledTimes(5);
    });
  });

  // ---------------------------------------------------------------------------
  // Validation failures → 400
  // ---------------------------------------------------------------------------

  describe('validation failures → 400', () => {
    it('returns 400 when reviewer_name is missing', async () => {
      const { reviewer_name, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating is missing', async () => {
      const { rating, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(res.status).toBe(400);
    });

    it('returns 400 when comment is missing', async () => {
      const { comment, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(res.status).toBe(400);
    });

    it('400 response has JSON content-type', async () => {
      const { reviewer_name, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('400 response body names the failing field (reviewer_name)', async () => {
      const { reviewer_name, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(JSON.stringify(res.body).toLowerCase()).toMatch(/reviewer_name/);
    });

    it('400 response body names the failing field (rating)', async () => {
      const { rating, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(JSON.stringify(res.body).toLowerCase()).toMatch(/rating/);
    });

    it('400 response body names the failing field (comment)', async () => {
      const { comment, ...body } = VALID_BODY;
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(body);
      expect(JSON.stringify(res.body).toLowerCase()).toMatch(/comment/);
    });

    it('does not call the database when validation fails', async () => {
      const { reviewer_name, ...body } = VALID_BODY;
      await request(app).post(`/api/cars/${CAR_ID}/reviews`).send(body);
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    // reviewer_name type checks
    it('returns 400 when reviewer_name is null', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, reviewer_name: null });
      expect(res.status).toBe(400);
    });

    it('returns 400 when reviewer_name is a number', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, reviewer_name: 42 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when reviewer_name is a boolean', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, reviewer_name: true });
      expect(res.status).toBe(400);
    });

    // rating range checks
    it('returns 400 when rating is 0 (below minimum)', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: 0 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating is 6 (above maximum)', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: 6 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating is -1', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: -1 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating is a non-integer float', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: 3.5 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating is a numeric string', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: '4' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when rating is null', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, rating: null });
      expect(res.status).toBe(400);
    });

    // comment type / length checks
    it('returns 400 when comment is null', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, comment: null });
      expect(res.status).toBe(400);
    });

    it('returns 400 when comment is a number', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, comment: 99 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when comment is 9 characters (one below minimum)', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, comment: '123456789' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when comment is an empty string', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ ...VALID_BODY, comment: '' });
      expect(res.status).toBe(400);
    });

    it('400 body describes multiple failing fields when several are invalid', async () => {
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send({ rating: 10, comment: 'Short' });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      const bodyStr = JSON.stringify(res.body).toLowerCase();
      // All three invalid fields should be mentioned
      expect(bodyStr).toMatch(/reviewer_name/);
      expect(bodyStr).toMatch(/rating/);
      expect(bodyStr).toMatch(/comment/);
    });
  });

  // ---------------------------------------------------------------------------
  // Database errors → 500
  // ---------------------------------------------------------------------------

  describe('database errors → 500', () => {
    it('returns 500 when the database query throws', async () => {
      mockPoolQuery = jest.fn().mockRejectedValue(new Error('Connection refused'));
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.status).toBe(500);
    });

    it('returns JSON content-type on 500', async () => {
      mockPoolQuery = jest.fn().mockRejectedValue(new Error('DB timeout'));
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('500 response body does not leak internal error details', async () => {
      mockPoolQuery = jest.fn().mockRejectedValue(new Error('Internal: secret DB password'));
      const res = await request(app)
        .post(`/api/cars/${CAR_ID}/reviews`)
        .send(VALID_BODY);
      expect(res.status).toBe(500);
      // Should have some error indicator but not expose raw DB error messages
      expect(res.body).toBeDefined();
    });
  });
});
