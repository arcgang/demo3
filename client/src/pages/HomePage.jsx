import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="180" viewBox="0 0 400 180"%3E%3Crect width="400" height="180" fill="%23e0e0e0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="14" fill="%23aaa"%3ENo image%3C/text%3E%3C/svg%3E';

function SkeletonCard() {
  return (
    <li className="skeleton-card">
      <div className="skeleton-block skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton-block skeleton-line skeleton-line--short" />
        <div className="skeleton-block skeleton-line skeleton-line--medium" style={{ marginTop: '8px' }} />
        <div className="skeleton-block skeleton-line skeleton-line--long" style={{ marginTop: '8px' }} />
      </div>
    </li>
  );
}

function CarCard({ car }) {
  const { id, make, model, year, thumbnail_url, avg_rating, review_count } = car;
  const imgSrc = thumbnail_url || PLACEHOLDER_IMG;

  return (
    <li>
      <Link to={`/cars/${id}`} className="car-card" aria-label={`${year} ${make} ${model}`}>
        <img
          className="car-card__img"
          src={imgSrc}
          alt={`${make} ${model}`}
          onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
        />
        <div className="car-card__body">
          <div className="car-card__make">{make}</div>
          <div className="car-card__model">{model}</div>
          <div className="car-card__year">{year}</div>
          {review_count > 0 ? (
            <div className="car-card__rating">
              <span className="car-card__stars">&#9733; {avg_rating}</span>
              <span className="car-card__review-count">({review_count} reviews)</span>
            </div>
          ) : (
            <div className="car-card__no-reviews">No reviews yet</div>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function HomePage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/cars')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCars(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <main className="page">
      <h1 className="page-title">Car Catalog</h1>

      {loading && (
        <ul
          className="skeleton-grid"
          role="status"
          aria-label="Loading"
          data-testid="loading"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </ul>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state__icon">&#9888;</div>
          <div className="empty-state__title">Something went wrong</div>
          <div className="empty-state__subtitle">Could not load cars. Please try again later.</div>
        </div>
      )}

      {!loading && !error && cars.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">&#128663;</div>
          <div className="empty-state__title">No cars available</div>
          <div className="empty-state__subtitle">Check back later for new listings.</div>
        </div>
      )}

      {!loading && !error && cars.length > 0 && (
        <ul className="car-grid" data-testid="car-grid">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </ul>
      )}
    </main>
  );
}
