const express = require('express');
const { Pool } = require('pg');
const { cars, reviews } = require('./db');

const app = express();
app.use(express.json());

const pool = new Pool();

app.get('/api/cars/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const car = isNaN(id) ? undefined : cars.find(c => c.id === id);

  if (!car) {
    return res.status(404).json({ error: `Car with id ${req.params.id} not found.` });
  }

  const carReviews = reviews.filter(r => r.carId === id);
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

app.post('/api/cars/:id/reviews', async (req, res) => {
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

module.exports = app;
