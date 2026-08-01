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

### `POST /api/cars/:id/reviews`

Submits a new review for the car identified by `:id`.

**Request body** — `Content-Type: application/json`

```json
{
  "reviewer_name": "Jane Doe",
  "rating": 4,
  "comment": "Great car, very comfortable ride."
}
```

| Field           | Type     | Constraints                        |
| --------------- | -------- | ---------------------------------- |
| `reviewer_name` | `string` | Required; non-blank after trimming |
| `rating`        | `number` | Required; integer in range 1–5     |
| `comment`       | `string` | Required; ≥ 10 characters after trimming |

**Response — `201 Created`**

```json
{
  "id": 7,
  "car_id": 1,
  "reviewer_name": "Jane Doe",
  "rating": 4,
  "comment": "Great car, very comfortable ride.",
  "created_at": "2026-08-01T12:00:00.000Z"
}
```

**Response — `400 Bad Request`** (validation failure)

```json
{
  "errors": {
    "rating": "Rating must be an integer between 1 and 5",
    "comment": "Comment must be at least 10 characters"
  }
}
```

**Response — `404 Not Found`** — `:id` is non-numeric or ≤ 0.

**Response — `500 Internal Server Error`** — database error.
