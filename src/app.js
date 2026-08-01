const express = require('express');
const { Pool } = require('pg');
const { cars, reviews } = require('./db');

const REVIEW_SUBMISSION_WINDOW_MS = 60 * 1000;
const REVIEW_SUBMISSION_MAX_REQUESTS = 5;

function createRateLimiter({ windowMs, maxRequests, message }) {
  const requestsByClient = new Map();

  function rateLimiter(req, res, next) {
    const forwardedFor = req.get('x-forwarded-for');
    const clientKey = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;
    const now = Date.now();
    const existingEntry = requestsByClient.get(clientKey);

    if (!existingEntry || now >= existingEntry.expiresAt) {
      requestsByClient.set(clientKey, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (existingEntry.count >= maxRequests) {
      return res.status(429).json({ error: message });
    }

    existingEntry.count += 1;
    return next();
  }

  rateLimiter.reset = () => {
    requestsByClient.clear();
  };

  return rateLimiter;
}

const app = express();
app.use(express.json());

const pool = new Pool();
const reviewSubmissionRateLimiter = createRateLimiter({
  windowMs: REVIEW_SUBMISSION_WINDOW_MS,
  maxRequests: REVIEW_SUBMISSION_MAX_REQUESTS,
  message: 'Too many review submissions. Please try again later.',
});

app.locals.reviewSubmissionRateLimiter = reviewSubmissionRateLimiter;

app.get('/api/cars', (req, res) => {
  const result = cars.map((car) => {
    const carReviews = reviews.filter((r) => r.car_id === car.id);
    const review_count = carReviews.length;
    const avg_rating = review_count === 0
      ? null
      : Math.round(carReviews.reduce((sum, r) => sum + r.rating, 0) / review_count * 100) / 100;
    return {
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      description: car.description,
      avg_rating,
      review_count,
    };
  });
  res.json(result);
});

app.get('/api/cars/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const car = (isNaN(id) || id <= 0) ? undefined : cars.find(c => c.id === id);

  if (!car) {
    return res.status(404).json({ error: `Car with id ${req.params.id} not found.` });
  }

  const carReviews = reviews.filter(r => r.car_id === id);
  const reviewCount = carReviews.length;
  const averageRating = reviewCount === 0
    ? null
    : Math.round(carReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount * 10) / 10;

  return res.json({
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    description: car.description,
    averageRating,
    reviewCount,
  });
});

app.post('/api/cars/:id/reviews', reviewSubmissionRateLimiter, async (req, res) => {
  const { reviewer_name, rating, comment } = req.body ?? {};
  const errors = {};

  if (reviewer_name === undefined || reviewer_name === null || typeof reviewer_name !== 'string') {
    errors.reviewer_name = 'reviewer_name is required and must be a string';
  } else if (!reviewer_name.trim().length) {
    errors.reviewer_name = 'reviewer_name must not be empty';
  }

  if (
    rating === undefined ||
    rating === null ||
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    errors.rating = 'rating is required and must be an integer between 1 and 5';
  }

  if (comment === undefined || comment === null || typeof comment !== 'string') {
    errors.comment = 'comment is required and must be a string with at least 10 characters';
  } else if (comment.trim().length < 10) {
    errors.comment = 'comment must be at least 10 characters';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const trimmedName = reviewer_name.trim();
  const trimmedComment = comment.trim();
  const carId = parseInt(req.params.id, 10);

  if (isNaN(carId) || carId <= 0) {
    return res.status(404).json({ error: 'Car not found' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO reviews (car_id, reviewer_name, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [carId, trimmedName, rating, trimmedComment]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/cars/:id/reviews', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const car = (isNaN(id) || id <= 0) ? undefined : cars.find(c => c.id === id);

  if (!car) {
    return res.status(404).json({ error: `Car with id ${req.params.id} not found.` });
  }

  const rawPage = req.query.page;
  const rawLimit = req.query.limit;

  if (rawPage !== undefined && rawPage !== null && typeof rawPage !== 'string') {
    return res.status(400).json({ error: 'page must be a string or omitted.' });
  }
  if (rawLimit !== undefined && rawLimit !== null && typeof rawLimit !== 'string') {
    return res.status(400).json({ error: 'limit must be a string or omitted.' });
  }

  let page = 1;
  let limit = null;

  if (rawPage !== undefined) {
    const parsed = parseInt(rawPage, 10);
    if (isNaN(parsed) || parsed <= 0 || String(parsed) !== rawPage.trim()) {
      return res.status(400).json({ error: 'page must be a positive integer.' });
    }
    page = parsed;
  }

  if (rawLimit !== undefined) {
    const parsed = parseInt(rawLimit, 10);
    if (isNaN(parsed) || parsed <= 0 || String(parsed) !== rawLimit.trim()) {
      return res.status(400).json({ error: 'limit must be a positive integer.' });
    }
    limit = parsed;
  }

  const sorted = reviews
    .filter(r => r.car_id === id)
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const paginated = limit === null
    ? sorted
    : sorted.slice((page - 1) * limit, page * limit);

  return res.json(paginated.map(r => ({
    id: r.id,
    car_id: r.car_id,
    reviewer_name: r.reviewer_name,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
  })));
});

module.exports = app;
