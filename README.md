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
