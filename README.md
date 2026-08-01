# demo3

## API Contract

### GET /api/cars/:id

Returns details for a single car including its computed review stats.

**Response** `200 OK`
```json
{
  "id": 1,
  "make": "Toyota",
  "model": "Camry",
  "year": 2022,
  "description": "A reliable sedan.",
  "averageRating": 4.3,
  "reviewCount": 6
}
```

- `averageRating` — average of all review ratings rounded to one decimal place; `null` when there are no reviews.
- `reviewCount` — total number of reviews for this car.

**Errors**
- `404 Not Found` — no car with the given id exists.

---

### POST /api/cars/:id/reviews

Submits a new review for a car, stores it, and returns the created review together with the car's recalculated stats.

**Request body**
```json
{
  "rating": 4,
  "author": "Jane Doe",
  "comment": "Great car!"
}
```

| Field     | Type    | Required | Notes |
|-----------|---------|----------|-------|
| `rating`  | integer | yes      | 1–5 inclusive |
| `author`  | string  | yes      | whitespace-only is rejected |
| `comment` | string  | no       | may be `null` or omitted |

**Response** `201 Created`
```json
{
  "review": {
    "id": 7,
    "carId": 1,
    "rating": 4,
    "comment": "Great car!",
    "author": "Jane Doe"
  },
  "car": {
    "averageRating": 4.3,
    "reviewCount": 7
  }
}
```

- `review.author` is stored trimmed.
- `review.comment` is `null` when omitted.
- `car.averageRating` and `car.reviewCount` are recalculated server-side from persisted data; client-supplied values are never trusted.

**Errors**
- `400 Bad Request` — validation failure (missing/invalid `rating` or `author`, wrong type for `comment`).
- `404 Not Found` — no car with the given id exists.
