const express = require('express');
const { cars, reviews } = require('./db');

const app = express();
app.use(express.json());

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

app.post('/api/cars/:id/reviews', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const car = isNaN(id) ? undefined : cars.find(c => c.id === id);

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

  const newReview = {
    id: reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1,
    carId: id,
    rating,
    comment: comment !== undefined ? comment : null,
    author: author.trim(),
  };
  reviews.push(newReview);

  const carReviews = reviews.filter(r => r.carId === id);
  const reviewCount = carReviews.length;
  const averageRating = Math.round(carReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount * 10) / 10;

  return res.status(201).json({
    review: newReview,
    car: { averageRating, reviewCount },
  });
});

module.exports = app;
