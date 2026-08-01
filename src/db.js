const cars = [
  { id: 1, make: 'Toyota', model: 'Camry', year: 2022, description: 'Reliable midsize sedan with excellent fuel economy.' },
  { id: 2, make: 'Ford', model: 'Mustang', year: 2021, description: 'Iconic American muscle car with a powerful V8 engine.' },
  { id: 3, make: 'Honda', model: 'Civic', year: 2023, description: 'Compact car known for its practicality and low cost of ownership.' },
];

const reviews = [
  { id: 1, carId: 1, reviewer_name: null, rating: 4, comment: null },
  { id: 2, carId: 1, reviewer_name: null, rating: 5, comment: null },
  { id: 3, carId: 1, reviewer_name: null, rating: 3, comment: null },
  { id: 4, carId: 3, reviewer_name: null, rating: 5, comment: null },
  { id: 5, carId: 3, reviewer_name: null, rating: 4, comment: null },
];

module.exports = { cars, reviews };
