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

module.exports = app;
