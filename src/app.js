const express = require('express');
const { cars, reviews } = require('./db');

const app = express();
app.use(express.json());

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

app.post('/api/cars/:id/reviews', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const car = (isNaN(id) || id <= 0) ? undefined : cars.find(c => c.id === id);

  if (!car) {
    return res.status(404).json({ error: `Car with id ${req.params.id} not found.` });
  }

  const { rating, comment, author } = req.body;

  if (rating === undefined || rating === null) {
    return res.status(400).json({ error: 'rating is required.' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' });
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    return res.status(400).json({ error: 'comment must be a string.' });
  }
  if (!author || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({ error: 'author is required.' });
  }

  const trimmedAuthor = author.trim();
  const newReview = {
    id: reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1,
    car_id: id,
    reviewer_name: trimmedAuthor,
    rating,
    comment: comment !== undefined ? comment : null,
    created_at: new Date().toISOString(),
  };
  reviews.push(newReview);

  const carReviews = reviews.filter(r => r.car_id === id);
  const reviewCount = carReviews.length;
  const averageRating = Math.round(carReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount * 10) / 10;

  return res.status(201).json({
    review: {
      id: newReview.id,
      carId: id,
      rating: newReview.rating,
      comment: newReview.comment,
      author: trimmedAuthor,
    },
    car: { averageRating, reviewCount },
  });
});

module.exports = app;
