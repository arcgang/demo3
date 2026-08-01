import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function CarDetail() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetch(`/api/cars/${id}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setCar(data);
      })
      .catch(() => setNotFound(true));

    fetch(`/api/cars/${id}/reviews`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(() => {
        setSubmitError('Could not load reviews.');
      });
  }, [id]);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    fetch(`/api/cars/${id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, rating: Number(rating), comment }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setSubmitError(data.error || 'Submission failed. Please try again.');
          return;
        }
        const { review, car: carStats } = data;
        setReviews((prev) => [review, ...prev]);
        setCar((prev) => ({
          ...prev,
          averageRating: carStats.averageRating,
          reviewCount: carStats.reviewCount,
        }));
        setAuthor('');
        setRating('');
        setComment('');
      })
      .catch(() => {
        setSubmitError('Network error. Please try again.');
      });
  }

  if (notFound) {
    return <h2>Car not found</h2>;
  }

  if (!car) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>{car.year} {car.make} {car.model}</h1>
      <p>{car.description}</p>
      <div>
        {car.averageRating != null
          ? <span>{car.averageRating.toFixed(1)} / 5</span>
          : null}
        <span>{car.reviewCount} reviews</span>
      </div>

      <h2>Write a Review</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Author
          <input
            name="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </label>
        <label>
          Rating
          <input
            name="rating"
            type="number"
            min="1"
            max="5"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </label>
        <label>
          Comment
          <textarea
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        {submitError && (
          <div role="alert" style={{ border: '1px solid red', background: '#fee', color: '#900', padding: '0.5rem' }}>{submitError}</div>
        )}
        <button type="submit">Submit Review</button>
      </form>

      <ul>
        {reviews.map((review, index) => (
          <li key={review.id != null ? review.id : index}>
            <strong>{review.reviewer_name || review.author}</strong>
            <span> - Rating: {review.rating}</span>
            {review.comment && <p>{review.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
