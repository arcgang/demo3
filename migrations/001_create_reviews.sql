CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  car_id        INTEGER NOT NULL REFERENCES cars (id),
  reviewer_name VARCHAR NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_car_id_idx ON reviews (car_id);
