const cars = [
  { id: 1, make: 'Toyota', model: 'Camry', year: 2022, description: 'Reliable midsize sedan with excellent fuel economy.' },
  { id: 2, make: 'Ford', model: 'Mustang', year: 2021, description: 'Iconic American muscle car with a powerful V8 engine.' },
  { id: 3, make: 'Honda', model: 'Civic', year: 2023, description: 'Compact car known for its practicality and low cost of ownership.' },
];

const reviews = [
  { id: 1, carId: 1, rating: 4, comment: null, author: 'Seed User' },
  { id: 2, carId: 1, rating: 5, comment: null, author: 'Seed User' },
  { id: 3, carId: 1, rating: 3, comment: null, author: 'Seed User' },
  { id: 4, carId: 3, rating: 5, comment: null, author: 'Seed User' },
  { id: 5, carId: 3, rating: 4, comment: null, author: 'Seed User' },
];

module.exports = { cars, reviews };
