const cars = [
  { id: 1, make: 'Toyota', model: 'Camry', year: 2022, description: 'Reliable midsize sedan with excellent fuel economy.' },
  { id: 2, make: 'Ford', model: 'Mustang', year: 2021, description: 'Iconic American muscle car with a powerful V8 engine.' },
  { id: 3, make: 'Honda', model: 'Civic', year: 2023, description: 'Compact car known for its practicality and low cost of ownership.' },
];

const reviews = [
  { id: 1, car_id: 1, reviewer_name: 'Alice Johnson', rating: 5, comment: 'Amazing car, very reliable!', created_at: '2024-03-15T10:00:00.000Z' },
  { id: 2, car_id: 1, reviewer_name: 'Bob Smith', rating: 4, comment: 'Very smooth ride.', created_at: '2024-02-10T08:30:00.000Z' },
  { id: 3, car_id: 1, reviewer_name: 'Charlie Brown', rating: 3, comment: null, created_at: '2024-01-05T14:00:00.000Z' },
  { id: 4, car_id: 3, reviewer_name: 'Diana Prince', rating: 5, comment: 'Love this compact car!', created_at: '2024-03-20T09:00:00.000Z' },
  { id: 5, car_id: 3, reviewer_name: 'Edward Norton', rating: 4, comment: 'Great value for money.', created_at: '2024-01-20T11:00:00.000Z' },
];

module.exports = { cars, reviews };
