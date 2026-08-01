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

### `GET /api/cars/:id`

Returns a single car by its identifier.

**Path parameters**

| Parameter | Type     | Notes                 |
| --------- | -------- | --------------------- |
| `id`      | `number` | Unique car identifier |

**Response** — `200 OK`, `Content-Type: application/json`

```json
{
  "id": 1,
  "make": "Toyota",
  "model": "Camry",
  "year": 2022,
  "description": "Reliable midsize sedan with excellent fuel economy.",
  "averageRating": 4.7,
  "reviewCount": 3
}
```

| Field           | Type           | Notes                                                         |
| --------------- | -------------- | ------------------------------------------------------------- |
| `id`            | `number`       | Unique car identifier                                         |
| `make`          | `string`       | Manufacturer name                                             |
| `model`         | `string`       | Model name                                                    |
| `year`          | `number`       | Four-digit model year                                         |
| `description`   | `string`       | Short description of the car                                  |
| `averageRating` | `number\|null` | Mean rating rounded to 1 decimal place; `null` if no reviews |
| `reviewCount`   | `number`       | Integer count of reviews (≥ 0)                               |

**Error responses**

| Status | Condition                  |
| ------ | -------------------------- |
| `404`  | No car with the given `id` |

---

### `GET /api/cars/:id/reviews`

Returns all reviews for a car, ordered newest-first (`created_at` DESC).

**Path parameters**

| Parameter | Type     | Notes                 |
| --------- | -------- | --------------------- |
| `id`      | `number` | Unique car identifier |

**Query parameters**

| Parameter | Type     | Default | Notes                                                                            |
| --------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `page`    | `number` | `1`     | 1-based page index; only used when `limit` is also provided                     |
| `limit`   | `number` | all     | If omitted, all reviews are returned; when provided, slices the sorted list page |

**Response** — `200 OK`, `Content-Type: application/json`

```json
[
  {
    "id": 7,
    "car_id": 1,
    "reviewer_name": "Alice",
    "rating": 5,
    "comment": "Great car, very reliable.",
    "created_at": "2025-06-15T10:30:00.000Z"
  }
]
```

An empty array `[]` is returned when the car exists but has no reviews.

| Field           | Type          | Notes                                            |
| --------------- | ------------- | ------------------------------------------------ |
| `id`            | `number`      | Unique review identifier                         |
| `car_id`        | `number`      | Foreign key to the car                           |
| `reviewer_name` | `string`      | Display name of the reviewer                     |
| `rating`        | `number`      | Integer in the range **1–5**                     |
| `comment`       | `string\|null`| Review body text; `null` if no comment was left  |
| `created_at`    | `string`      | ISO 8601 timestamp (UTC)                         |

Reviews are always ordered **newest-first** by `created_at`.

**Error responses**

| Status | Condition                   |
| ------ | --------------------------- |
| `400`  | Invalid `page`/`limit` value |
| `404`  | No car with the given `id`  |

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

| Field           | Type     | Constraints                                |
| --------------- | -------- | ------------------------------------------ |
| `reviewer_name` | `string` | Required; non-blank after trimming         |
| `rating`        | `number` | Required; integer in range 1–5             |
| `comment`       | `string` | Required; at least 10 characters (trimmed) |

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

**Error responses**

| Status | Condition                                 |
| ------ | ----------------------------------------- |
| `400`  | Request body validation failed            |
| `404`  | `:id` is non-numeric, invalid, or missing |
| `500`  | Database insert failure                   |
