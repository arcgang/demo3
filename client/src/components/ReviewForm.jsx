import { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function ReviewForm() {
  const { id } = useParams();

  const [name, setName] = useState('');
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  function validate() {
    const next = {};
    if (!name.trim()) {
      next.name = 'Name is required.';
    }
    if (!rating) {
      next.rating = 'Rating is required.';
    }
    if (!comment.trim()) {
      next.comment = 'Comment is required.';
    } else if (comment.trim().length < 10) {
      next.comment = 'Comment must be at least 10 characters.';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess(false);
    setSubmitError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      const res = await fetch(`/api/cars/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: name,
          rating: Number(rating),
          comment,
        }),
      });

      if (!res.ok) {
        setSubmitError('Something went wrong. Please try again.');
        return;
      }

      setName('');
      setRating('');
      setComment('');
      setSuccess(true);
    } catch {
      setSubmitError('Could not submit your review. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="reviewer-name">Name</label>
        <input
          id="reviewer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <span role="alert" data-testid="error-name">{errors.name}</span>
        )}
      </div>

      <fieldset>
        <legend id="rating-legend">Star Rating</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <input
              type="radio"
              name="rating"
              value={String(n)}
              checked={rating === String(n)}
              onChange={() => setRating(String(n))}
              aria-label={`${n} star`}
            />
            {n}
          </label>
        ))}
        {errors.rating && (
          <span role="alert" data-testid="error-rating">{errors.rating}</span>
        )}
      </fieldset>

      <div>
        <label htmlFor="review-comment">Comment</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {errors.comment && (
          <span role="alert" data-testid="error-comment">{errors.comment}</span>
        )}
      </div>

      {submitError && (
        <div role="alert" className="error-banner">
          <p>{submitError}</p>
        </div>
      )}

      {success && (
        <p role="status">Thank you! Your review has been submitted.</p>
      )}

      <button type="submit">Submit Review</button>
    </form>
  );
}
