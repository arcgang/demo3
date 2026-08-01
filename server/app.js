const express = require('express');

const app = express();
app.use(express.json());

// --- In-memory data ---

const cars = [
  { id: 1, make: 'Toyota',   model: 'Camry',    year: 2022, thumbnail_url: 'https://example.com/camry.jpg' },
  { id: 2, make: 'Ford',     model: 'Mustang',  year: 2021, thumbnail_url: 'https://example.com/mustang.jpg' },
  { id: 3, make: 'Honda',    model: 'Civic',    year: 2023, thumbnail_url: 'https://example.com/civic.jpg' },
  { id: 4, make: 'Chevrolet',model: 'Silverado',year: 2020, thumbnail_url: null },
];

// car_id references cars above; ratings are 1-5
const reviews = [
  { id: 1, car_id: 1, rating: 4 },
  { id: 2, car_id: 1, rating: 5 },
  { id: 3, car_id: 1, rating: 3 },
  { id: 4, car_id: 2, rating: 5 },
  { id: 5, car_id: 2, rating: 4 },
  { id: 6, car_id: 3, rating: 3 },
  // car_id 4 (Silverado) intentionally has no reviews
];

// --- Routes ---

/*
 * GET /api/cars
 *
 * Response: 200 OK, Content-Type: application/json
 * Body: JSON array of car objects
 *
 * Car object shape:
 *   id            {number}       - unique car identifier
 *   make          {string}       - manufacturer name
 *   model         {string}       - model name
 *   year          {number}       - model year (integer)
 *   thumbnail_url {string|null}  - URL of a representative image, or null
 *   review_count  {number}       - integer count of associated reviews (>= 0)
 *   avg_rating    {number|null}  - mean review rating rounded to 2 decimal places,
 *                                  or null when review_count === 0
 *
 * Example item (car with reviews):
 *   { "id": 1, "make": "Toyota", "model": "Camry", "year": 2022,
 *     "thumbnail_url": "https://example.com/camry.jpg",
 *     "review_count": 3, "avg_rating": 4 }
 *
 * Example item (car without reviews):
 *   { "id": 4, "make": "Chevrolet", "model": "Silverado", "year": 2020,
 *     "thumbnail_url": null, "review_count": 0, "avg_rating": null }
 */
app.get('/api/cars', (req, res) => {
  const result = cars.map((car) => {
    const carReviews = reviews.filter((r) => r.car_id === car.id);
    const review_count = carReviews.length;
    let avg_rating = null;
    if (review_count > 0) {
      const sum = carReviews.reduce((acc, r) => acc + r.rating, 0);
      avg_rating = Math.round((sum / review_count) * 100) / 100;
    }
    return {
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      thumbnail_url: car.thumbnail_url,
      avg_rating,
      review_count,
    };
  });
  res.json(result);
});

module.exports = app;

// Only start the server when run directly (not during tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
