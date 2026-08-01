# demo3

## Running the server

```bash
cd server
npm install
npm start        # listens on PORT (default 3000)
```

## Running tests

```bash
cd server
npm test
```

## API Contract

### `GET /api/cars`

Returns all cars with aggregated review statistics.

**Response** — `200 OK`, `Content-Type: application/json`

```json
[
  {
    "id": 1,
    "make": "Toyota",
    "model": "Camry",
    "year": 2022,
    "thumbnail_url": "https://example.com/camry.jpg",
    "review_count": 3,
    "avg_rating": 4
  },
  {
    "id": 4,
    "make": "Chevrolet",
    "model": "Silverado",
    "year": 2020,
    "thumbnail_url": null,
    "review_count": 0,
    "avg_rating": null
  }
]
```

| Field           | Type            | Notes                                                         |
| --------------- | --------------- | ------------------------------------------------------------- |
| `id`            | `number`        | Unique car identifier                                         |
| `make`          | `string`        | Manufacturer name                                             |
| `model`         | `string`        | Model name                                                    |
| `year`          | `number`        | Four-digit model year                                         |
| `thumbnail_url` | `string\|null`  | Image URL, or `null` if unavailable                           |
| `review_count`  | `number`        | Integer count of reviews (≥ 0)                                |
| `avg_rating`    | `number\|null`  | Mean rating rounded to 2 decimal places; `null` if no reviews |

Ratings are in the range **1–5**.

---

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
