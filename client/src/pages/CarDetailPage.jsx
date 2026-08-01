import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const PAGE_SIZE = 5;

function StarRating({ rating }) {
  return (
    <span className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'star star--filled' : 'star star--empty'}>
          {i < rating ? '★' : '☆'}
        </span>
      ))}
      <span className="review-stars__value"> {rating}</span>
    </span>
  );
}

function ReviewItem({ review }) {
  const date = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="review-item" data-testid="review-item">
      <div className="review-item__header">
        <span className="review-item__name">{review.reviewer_name}</span>
        <StarRating rating={review.rating} />
        <span className="review-item__date">{date}</span>
      </div>
      <p className="review-item__comment">{review.comment}</p>
    </article>
  );
}

export default function CarDetailPage() {
  const { id } = useParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/cars/${id}/reviews`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setReviews(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const visibleReviews = reviews.slice(0, page * PAGE_SIZE);
  const hasMore = visibleReviews.length < reviews.length;

  return (
    <main className="page">
      <h1 className="page-title">Car Reviews</h1>

      {loading && (
        <div
          role="status"
          aria-label="Loading"
          data-testid="loading"
          className="loading-indicator"
        >
          Loading reviews...
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="error-message">
          <p>Error: could not load reviews. Please try again later.</p>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div role="status" aria-live="polite" className="empty-state-message">
          <p>Be the first to review this car</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <>
          <div className="reviews-list">
            {visibleReviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
          {hasMore && (
            <button
              className="load-more-btn"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more
            </button>
          )}
        </>
      )}
    </main>
  );
}
