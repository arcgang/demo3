/**
 * Acceptance tests for the review-submission flow on CarDetail.
 *
 * These tests are RED until the feature is implemented. They require:
 *   - @testing-library/react and @testing-library/jest-dom installed
 *   - Jest configured to transform JSX (babel-jest + @babel/preset-react)
 *   - React component exported from src/frontend/CarDetail.jsx
 *
 * Feature contract being tested:
 *   1. Existing reviews are fetched and displayed below the car info.
 *   2. A review submission form (author, rating, comment, submit) is present.
 *   3. On successful POST to /api/cars/:id/reviews, the returned review
 *      object is prepended to the top of the review list.
 *   4. The displayed averageRating and reviewCount are updated in-place
 *      using the server-returned values from the POST response (car field),
 *      NOT a client-side recalculation — all without a full page reload.
 */

const React = require('react');
const { render, screen, waitFor, fireEvent, within } = require('@testing-library/react');
require('@testing-library/jest-dom');
const { MemoryRouter, Routes, Route } = require('react-router-dom');

const CarDetailModule = require('../src/frontend/CarDetail');
const CarDetail = CarDetailModule.default || CarDetailModule;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CAR = {
  id: 1,
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  description: 'A reliable sedan.',
  averageRating: 4.0,
  reviewCount: 2,
};

const EXISTING_REVIEWS = [
  {
    id: 2,
    car_id: 1,
    reviewer_name: 'Bob Smith',
    rating: 4,
    comment: 'Very smooth ride.',
    created_at: '2024-02-10T08:30:00.000Z',
  },
  {
    id: 1,
    car_id: 1,
    reviewer_name: 'Alice Johnson',
    rating: 3,
    comment: 'Reliable but nothing special.',
    created_at: '2024-01-05T14:00:00.000Z',
  },
];

// POST response shape returned by POST /api/cars/:id/reviews
const POST_RESPONSE = {
  review: {
    id: 10,
    carId: 1,
    rating: 5,
    comment: 'Absolutely fantastic!',
    author: 'New Reviewer',
  },
  // Server-computed stats — used verbatim by the UI (no client recalculation)
  car: {
    averageRating: 4.3,
    reviewCount: 3,
  },
};

// A POST response whose car.averageRating deliberately differs from what the
// client would compute so we can confirm the UI uses the server value.
const DECEPTIVE_POST_RESPONSE = {
  review: {
    id: 11,
    carId: 1,
    rating: 5,
    comment: 'Test',
    author: 'Tester',
  },
  car: {
    // Client-side naive calc for adding rating=5 to [4,3] → (4+3+5)/3 = 4.0
    // Server returns 3.7 — the UI must display 3.7, not 4.0 or 4.
    averageRating: 3.7,
    reviewCount: 3,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sets up global.fetch so that:
 *   GET  /api/cars/:id          → CAR
 *   GET  /api/cars/:id/reviews  → EXISTING_REVIEWS
 *   POST /api/cars/:id/reviews  → postResponse (default: POST_RESPONSE)
 */
function setupFetchMocks({ postResponse = POST_RESPONSE, postStatus = 201 } = {}) {
  global.fetch = jest.fn((url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();

    if (method === 'POST') {
      return Promise.resolve({
        ok: postStatus >= 200 && postStatus < 300,
        status: postStatus,
        json: () => Promise.resolve(postResponse),
      });
    }

    // GET /api/cars/:id/reviews — must be tested before the shorter car pattern
    if (/\/api\/cars\/\d+\/reviews/.test(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(EXISTING_REVIEWS),
      });
    }

    // GET /api/cars/:id
    if (/\/api\/cars\/\d+/.test(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CAR),
      });
    }

    return Promise.reject(new Error(`Unexpected fetch to: ${url}`));
  });
}

/** Render CarDetail inside a MemoryRouter so useParams() returns { id: '1' }. */
function renderCarDetail() {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/cars/1'] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: '/cars/:id',
          element: React.createElement(CarDetail),
        })
      )
    )
  );
}

/** Wait for the car heading to appear — signals initial data has loaded. */
async function waitForCarLoaded() {
  await waitFor(() => {
    if (!screen.queryByText(/toyota/i)) throw new Error('Car not yet loaded');
  });
}

/**
 * Fill in and submit the review form.
 * Returns after fireEvent.click on the submit button.
 */
function submitReviewForm({ author = 'New Reviewer', rating = '5', comment = 'Absolutely fantastic!' } = {}) {
  const authorInput =
    screen.queryByLabelText(/author|name|reviewer/i) ||
    screen.queryByPlaceholderText(/author|name|reviewer/i) ||
    document.querySelector('input[name="author"], input[name="name"], input[name="reviewer_name"]');

  const ratingInput =
    screen.queryByLabelText(/rating/i) ||
    screen.queryByRole('spinbutton', { name: /rating/i }) ||
    screen.queryByRole('combobox', { name: /rating/i }) ||
    document.querySelector('input[name="rating"], select[name="rating"]');

  const commentInput =
    screen.queryByLabelText(/comment/i) ||
    screen.queryByPlaceholderText(/comment/i) ||
    document.querySelector('textarea[name="comment"], input[name="comment"]');

  const submitButton =
    screen.queryByRole('button', { name: /submit|post|add|send/i }) ||
    document.querySelector('button[type="submit"]');

  if (authorInput) fireEvent.change(authorInput, { target: { value: author } });
  if (ratingInput) fireEvent.change(ratingInput, { target: { value: rating } });
  if (commentInput) fireEvent.change(commentInput, { target: { value: comment } });
  if (submitButton) fireEvent.click(submitButton);
}

afterEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Reviews list display
// ---------------------------------------------------------------------------

describe('CarDetail – existing reviews list', () => {
  beforeEach(async () => {
    setupFetchMocks();
    renderCarDetail();
    await waitForCarLoaded();
  });

  it('fetches reviews from GET /api/cars/:id/reviews on mount', async () => {
    await waitFor(() => {
      const reviewsCalls = global.fetch.mock.calls.filter(
        ([url, opts]) => /\/api\/cars\/\d+\/reviews/.test(url) && !(opts && opts.method === 'POST')
      );
      expect(reviewsCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays each existing reviewer name', async () => {
    await waitFor(() => {
      expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
  });

  it('displays each existing review comment', async () => {
    await waitFor(() => {
      expect(screen.getByText(/very smooth ride/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/reliable but nothing special/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Review submission form
// ---------------------------------------------------------------------------

describe('CarDetail – review submission form', () => {
  beforeEach(async () => {
    setupFetchMocks();
    renderCarDetail();
    await waitForCarLoaded();
  });

  it('renders an input for the reviewer name or author', () => {
    const input =
      screen.queryByLabelText(/author|name|reviewer/i) ||
      screen.queryByPlaceholderText(/author|name|reviewer/i) ||
      document.querySelector('input[name="author"], input[name="name"], input[name="reviewer_name"]');
    expect(input).not.toBeNull();
  });

  it('renders an input or select for the rating', () => {
    const input =
      screen.queryByLabelText(/rating/i) ||
      screen.queryByRole('spinbutton', { name: /rating/i }) ||
      screen.queryByRole('combobox', { name: /rating/i }) ||
      document.querySelector('input[name="rating"], select[name="rating"]');
    expect(input).not.toBeNull();
  });

  it('renders an input or textarea for the comment', () => {
    const input =
      screen.queryByLabelText(/comment/i) ||
      screen.queryByPlaceholderText(/comment/i) ||
      document.querySelector('textarea[name="comment"], input[name="comment"]');
    expect(input).not.toBeNull();
  });

  it('renders a submit button for the review form', () => {
    const button =
      screen.queryByRole('button', { name: /submit|post|add|send/i }) ||
      document.querySelector('button[type="submit"]');
    expect(button).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// After successful POST: new review prepended
// ---------------------------------------------------------------------------

describe('CarDetail – new review prepended to list after submission', () => {
  beforeEach(async () => {
    setupFetchMocks();
    renderCarDetail();
    await waitForCarLoaded();
    // Wait for reviews list to render
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());
    submitReviewForm();
  });

  it('shows the new reviewer name after submission', async () => {
    await waitFor(() => {
      expect(screen.getByText(/new reviewer/i)).toBeInTheDocument();
    });
  });

  it('shows the new review comment after submission', async () => {
    await waitFor(() => {
      expect(screen.getByText(/absolutely fantastic/i)).toBeInTheDocument();
    });
  });

  it('places the new review above the previously first review (prepend)', async () => {
    await waitFor(() => {
      expect(screen.getByText(/new reviewer/i)).toBeInTheDocument();
    });

    // Get all review items — new review must appear before Bob Smith
    const allText = document.body.textContent || '';
    const newIdx = allText.indexOf('New Reviewer');
    const existingIdx = allText.indexOf('Bob Smith');
    expect(newIdx).toBeGreaterThanOrEqual(0);
    expect(existingIdx).toBeGreaterThanOrEqual(0);
    expect(newIdx).toBeLessThan(existingIdx);
  });

  it('existing reviews remain in the list after prepending the new one', async () => {
    await waitFor(() => {
      expect(screen.getByText(/new reviewer/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
    expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// After successful POST: averageRating updated from server response
// ---------------------------------------------------------------------------

describe('CarDetail – averageRating updated from server POST response', () => {
  it('displays the server-returned averageRating after submission', async () => {
    setupFetchMocks();
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm();

    // POST_RESPONSE.car.averageRating = 4.3
    await waitFor(() => {
      expect(screen.getByText(/4\.3\s*\/\s*5/)).toBeInTheDocument();
    });
  });

  it('displays the server-returned reviewCount after submission', async () => {
    setupFetchMocks();
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm();

    // POST_RESPONSE.car.reviewCount = 3
    await waitFor(() => {
      expect(screen.getByText(/3\s+reviews/i)).toBeInTheDocument();
    });
  });

  it('uses the server-returned averageRating, not a client-side recalculation', async () => {
    setupFetchMocks({ postResponse: DECEPTIVE_POST_RESPONSE });
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm({ author: 'Tester', rating: '5', comment: 'Test' });

    // Server says 3.7; client-side naive calc of (4+3+5)/3 ≈ 4.0 — UI must show 3.7
    await waitFor(() => {
      expect(screen.getByText(/3\.7\s*\/\s*5/)).toBeInTheDocument();
    });
    // Must NOT show the client-recalculated value
    expect(screen.queryByText(/4\.0\s*\/\s*5/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// No full page reload
// ---------------------------------------------------------------------------

describe('CarDetail – no full page reload on submission', () => {
  it('does not call window.location.reload after a successful submission', async () => {
    setupFetchMocks();
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    });

    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm();

    await waitFor(() => {
      expect(screen.queryByText(/new reviewer/i)).toBeInTheDocument();
    });

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('does not re-fetch the car GET endpoint after a successful submission', async () => {
    setupFetchMocks();
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    const carGetCallsBefore = global.fetch.mock.calls.filter(
      ([url, opts]) => /\/api\/cars\/\d+$/.test(url) && !(opts && opts.method === 'POST')
    ).length;

    submitReviewForm();

    await waitFor(() => {
      expect(screen.queryByText(/new reviewer/i)).toBeInTheDocument();
    });

    const carGetCallsAfter = global.fetch.mock.calls.filter(
      ([url, opts]) => /\/api\/cars\/\d+$/.test(url) && !(opts && opts.method === 'POST')
    ).length;

    // The car GET should not be re-fetched — stats come from the POST response
    expect(carGetCallsAfter).toBe(carGetCallsBefore);
  });
});

// ---------------------------------------------------------------------------
// POST error handling
// ---------------------------------------------------------------------------

describe('CarDetail – POST error handling', () => {
  it('does not crash when the POST returns a non-2xx status', async () => {
    setupFetchMocks({ postStatus: 422, postResponse: { error: 'Validation failed.' } });
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    expect(() => submitReviewForm()).not.toThrow();

    // Give async handlers time to settle
    await waitFor(() => expect(document.body).toBeInTheDocument());
  });

  it('shows a visually prominent error element when the POST fails', async () => {
    setupFetchMocks({ postStatus: 422, postResponse: { error: 'Validation failed.' } });
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm();

    await waitFor(() => {
      // Error must appear in an h2, h3, or a role="alert" — not just an unstyled <p>
      const prominentError =
        document.querySelector('h2, h3, [role="alert"]') &&
        screen.queryByText(/error|failed|invalid|try again/i);
      expect(prominentError).not.toBeNull();
    });
  });

  it('does not crash when the fetch rejects on POST', async () => {
    global.fetch = jest.fn((url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      if (method === 'POST') return Promise.reject(new Error('Network error'));
      if (/\/api\/cars\/\d+\/reviews/.test(url)) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(EXISTING_REVIEWS) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(CAR) });
    });

    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    expect(() => submitReviewForm()).not.toThrow();
    await waitFor(() => expect(document.body).toBeInTheDocument());
  });

  it('keeps existing reviews visible when the POST fails', async () => {
    setupFetchMocks({ postStatus: 500, postResponse: { error: 'Internal server error.' } });
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm();

    await waitFor(() => expect(document.body).toBeInTheDocument());
    expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
    expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
  });

  it('does not update averageRating or reviewCount when the POST fails', async () => {
    setupFetchMocks({ postStatus: 400, postResponse: { error: 'Bad request.' } });
    renderCarDetail();
    await waitForCarLoaded();
    await waitFor(() => expect(screen.queryByText(/bob smith/i)).toBeInTheDocument());

    submitReviewForm();

    await waitFor(() => expect(document.body).toBeInTheDocument());
    // CAR.reviewCount = 2, should not become 3
    expect(screen.queryByText(/3\s+reviews/i)).not.toBeInTheDocument();
    // CAR.averageRating = 4.0, original rating display should be unchanged
    expect(screen.queryByText(/4\.3\s*\/\s*5/)).not.toBeInTheDocument();
  });
});
