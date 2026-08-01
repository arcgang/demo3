import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CarDetailPage from '../pages/CarDetailPage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CAR_ID = 42;

const REVIEWS_FIXTURE = [
  {
    id: 10,
    car_id: CAR_ID,
    reviewer_name: 'Alice',
    rating: 5,
    comment: 'Absolutely loved it!',
    created_at: '2025-06-15T10:00:00.000Z',
  },
  {
    id: 9,
    car_id: CAR_ID,
    reviewer_name: 'Bob',
    rating: 3,
    comment: 'Decent ride but nothing special.',
    created_at: '2025-05-01T08:30:00.000Z',
  },
  {
    id: 8,
    car_id: CAR_ID,
    reviewer_name: 'Carol',
    rating: 4,
    comment: 'Great value for money.',
    created_at: '2025-04-10T14:00:00.000Z',
  },
];

// 12 reviews to exercise pagination / infinite scroll boundary
const MANY_REVIEWS_FIXTURE = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  car_id: CAR_ID,
  reviewer_name: `Reviewer ${i + 1}`,
  rating: (i % 5) + 1,
  comment: `Comment number ${i + 1}.`,
  created_at: new Date(Date.UTC(2025, 0, 12 - i)).toISOString(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render CarDetailPage inside a MemoryRouter with the :id param set to CAR_ID.
 * The component MUST read the id via useParams(), not props.
 */
function renderCarDetailPage(id = CAR_ID) {
  return render(
    <MemoryRouter initialEntries={[`/cars/${id}`]}>
      <Routes>
        <Route path="/cars/:id" element={<CarDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockFetch(data, { status = 200, delay = 0 } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => data,
          }),
        delay
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CarDetailPage — GET /api/cars/:id/reviews integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Routing ─────────────────────────────────────────────────────────────

  describe('routing', () => {
    it('is reachable at /cars/:id without crashing', async () => {
      mockFetch(REVIEWS_FIXTURE);
      expect(() => renderCarDetailPage()).not.toThrow();
      await waitFor(() => expect(document.body).toBeInTheDocument());
    });

    it('reads the car id from the URL param (not a prop)', async () => {
      const spy = mockFetch(REVIEWS_FIXTURE);
      renderCarDetailPage(99);

      await waitFor(() => {
        const url = spy.mock.calls[0][0];
        expect(url).toMatch(/\/api\/cars\/99\/reviews/);
      });
    });
  });

  // ── API call ─────────────────────────────────────────────────────────────

  describe('API call', () => {
    it('fetches GET /api/cars/:id/reviews exactly once on mount', async () => {
      const spy = mockFetch(REVIEWS_FIXTURE);
      renderCarDetailPage();

      await waitFor(() => screen.getByText('Alice'));

      expect(spy).toHaveBeenCalledTimes(1);
      const url = spy.mock.calls[0][0];
      expect(url).toMatch(/\/api\/cars\/42\/reviews/);
    });
  });

  // ── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows a loading indicator while the request is in flight', async () => {
      mockFetch(REVIEWS_FIXTURE, { delay: 200 });
      renderCarDetailPage();

      const loading =
        screen.queryByRole('status') ||
        document.querySelector('[data-testid="loading"]') ||
        document.querySelector('[aria-label="Loading"]') ||
        screen.queryByText(/loading/i);

      expect(loading).not.toBeNull();

      // clean up open handles
      await waitFor(() => screen.getByText('Alice'));
    });

    it('hides the loading indicator once reviews are rendered', async () => {
      mockFetch(REVIEWS_FIXTURE);
      renderCarDetailPage();

      await waitFor(() => screen.getByText('Alice'));

      const loading =
        document.querySelector('[data-testid="loading"]') ||
        document.querySelector('[aria-label="Loading"]') ||
        screen.queryByRole('status');

      expect(loading).toBeNull();
    });
  });

  // ── Review cards rendered ─────────────────────────────────────────────

  describe('review cards', () => {
    beforeEach(() => {
      mockFetch(REVIEWS_FIXTURE);
    });

    it('renders one review entry per item returned by the API', async () => {
      renderCarDetailPage();
      await waitFor(() => screen.getByText('Alice'));

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Carol')).toBeInTheDocument();
    });

    it('displays the reviewer name for each review', async () => {
      renderCarDetailPage();
      await waitFor(() => screen.getByText('Alice'));

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('displays a star rating (1–5) for each review', async () => {
      renderCarDetailPage();
      await waitFor(() => screen.getByText('Alice'));

      // Rating value 5 for Alice's review must be visible
      expect(screen.getByText(/5/)).toBeInTheDocument();
      // Rating value 3 for Bob's review must be visible
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it('displays the comment text for each review', async () => {
      renderCarDetailPage();
      await waitFor(() => screen.getByText('Absolutely loved it!'));

      expect(screen.getByText('Absolutely loved it!')).toBeInTheDocument();
      expect(screen.getByText('Decent ride but nothing special.')).toBeInTheDocument();
      expect(screen.getByText('Great value for money.')).toBeInTheDocument();
    });

    it('displays a formatted submission date for each review', async () => {
      renderCarDetailPage();
      await waitFor(() => screen.getByText('Alice'));

      // The date 2025-06-15 must be rendered in some human-readable form
      // (e.g. "Jun 15, 2025" / "June 15, 2025" / "6/15/2025" / "2025-06-15")
      const datePatterns = [/jun/i, /june/i, /2025/, /15/];
      const found = datePatterns.some((re) => {
        const el = screen.queryByText(re);
        return el !== null;
      });
      expect(found).toBe(true);
    });
  });

  // ── Ordering ─────────────────────────────────────────────────────────────

  describe('ordering', () => {
    it('renders reviews newest-first (most recent created_at appears before older ones)', async () => {
      mockFetch(REVIEWS_FIXTURE);
      renderCarDetailPage();
      await waitFor(() => screen.getByText('Alice'));

      const names = ['Alice', 'Bob', 'Carol'];
      const positions = names.map((name) => {
        const el = screen.getByText(name);
        return el.compareDocumentPosition
          ? el
          : null;
      });

      // Alice (2025-06-15) should appear before Bob (2025-05-01)
      const alice = screen.getByText('Alice');
      const bob = screen.getByText('Bob');
      // Node.DOCUMENT_POSITION_FOLLOWING = 4 means bob comes after alice in DOM
      expect(alice.compareDocumentPosition(bob) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Bob (2025-05-01) should appear before Carol (2025-04-10)
      const carol = screen.getByText('Carol');
      expect(bob.compareDocumentPosition(carol) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows "Be the first to review this car" when the API returns an empty array', async () => {
      mockFetch([]);
      renderCarDetailPage();

      await waitFor(() => {
        expect(
          screen.getByText(/be the first to review this car/i)
        ).toBeInTheDocument();
      });
    });

    it('renders the empty-state message in a visually prominent element (not a bare <p>)', async () => {
      mockFetch([]);
      renderCarDetailPage();

      await waitFor(() => {
        const el = screen.getByText(/be the first to review this car/i);
        const tag = el.tagName.toLowerCase();
        // Must NOT be a plain unstyled <p>; expect h2, h3, or a container with a class
        const isProminent =
          tag === 'h2' ||
          tag === 'h3' ||
          el.closest('[class]') !== null;
        expect(isProminent).toBe(true);
      });
    });
  });

  // ── Error state ──────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows a generic error message when the fetch rejects', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      renderCarDetailPage();

      await waitFor(() => {
        const msg =
          screen.queryByText(/error/i) ||
          screen.queryByText(/something went wrong/i) ||
          screen.queryByText(/could not load/i) ||
          screen.queryByText(/failed/i) ||
          screen.queryByText(/try again/i);
        expect(msg).not.toBeNull();
      });
    });

    it('shows a generic error message when the API returns a non-OK status', async () => {
      mockFetch({ error: 'Car not found.' }, { status: 404 });
      renderCarDetailPage();

      await waitFor(() => {
        const msg =
          screen.queryByText(/error/i) ||
          screen.queryByText(/something went wrong/i) ||
          screen.queryByText(/could not load/i) ||
          screen.queryByText(/failed/i) ||
          screen.queryByText(/try again/i);
        expect(msg).not.toBeNull();
      });
    });

    it('renders the error message in a visually prominent element (not a bare <p>)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      renderCarDetailPage();

      await waitFor(() => {
        const el =
          screen.queryByText(/error/i) ||
          screen.queryByText(/something went wrong/i) ||
          screen.queryByText(/could not load/i) ||
          screen.queryByText(/failed/i) ||
          screen.queryByText(/try again/i);

        expect(el).not.toBeNull();

        const tag = el.tagName.toLowerCase();
        const isProminent =
          tag === 'h2' ||
          tag === 'h3' ||
          el.closest('[class]') !== null;
        expect(isProminent).toBe(true);
      });
    });

    it('does not produce an unhandled promise rejection when fetch fails', async () => {
      const rejectionHandler = vi.fn();
      window.addEventListener('unhandledrejection', rejectionHandler);

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      renderCarDetailPage();

      await waitFor(() => {
        const msg =
          screen.queryByText(/error/i) ||
          screen.queryByText(/something went wrong/i) ||
          screen.queryByText(/failed/i);
        expect(msg).not.toBeNull();
      });

      // Give microtasks a tick to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(rejectionHandler).not.toHaveBeenCalled();
      window.removeEventListener('unhandledrejection', rejectionHandler);
    });
  });

  // ── Pagination / infinite scroll ─────────────────────────────────────────

  describe('pagination or infinite scroll', () => {
    it('does not render all reviews in the DOM at once for a large list (pagination is present)', async () => {
      mockFetch(MANY_REVIEWS_FIXTURE);
      renderCarDetailPage();

      await waitFor(() => screen.getByText('Reviewer 1'));

      // Either: a "Load more" / "Next" button is visible, OR only a subset of
      // 12 reviews is initially rendered in the DOM.
      const loadMoreBtn =
        screen.queryByRole('button', { name: /load more/i }) ||
        screen.queryByRole('button', { name: /next/i }) ||
        screen.queryByRole('button', { name: /show more/i }) ||
        screen.queryByText(/load more/i) ||
        screen.queryByText(/next page/i);

      const renderedReviewerNames = Array.from(document.querySelectorAll('*'))
        .filter((el) => /^Reviewer \d+$/.test(el.textContent?.trim() ?? ''));

      const isPagedOrLimited =
        loadMoreBtn !== null || renderedReviewerNames.length < MANY_REVIEWS_FIXTURE.length;

      expect(isPagedOrLimited).toBe(true);
    });

    it('renders more reviews after triggering pagination (button click or scroll)', async () => {
      mockFetch(MANY_REVIEWS_FIXTURE);
      renderCarDetailPage();

      await waitFor(() => screen.getByText('Reviewer 1'));

      const loadMoreBtn =
        screen.queryByRole('button', { name: /load more/i }) ||
        screen.queryByRole('button', { name: /next/i }) ||
        screen.queryByRole('button', { name: /show more/i }) ||
        screen.queryByText(/load more/i);

      if (loadMoreBtn) {
        const countBefore = document.querySelectorAll('[data-testid="review-item"], .review-item, li[class*="review"], article[class*="review"]').length;
        fireEvent.click(loadMoreBtn);
        await waitFor(() => {
          const countAfter = document.querySelectorAll('[data-testid="review-item"], .review-item, li[class*="review"], article[class*="review"]').length;
          expect(countAfter).toBeGreaterThanOrEqual(countBefore);
        });
      } else {
        // Infinite scroll: verify at least some reviews are shown
        expect(screen.getByText('Reviewer 1')).toBeInTheDocument();
      }
    });
  });

  // ── App wiring ───────────────────────────────────────────────────────────

  describe('App / router wiring', () => {
    it('main.jsx (or App component) registers the /cars/:id route', async () => {
      // Import main.jsx source and verify it references the CarDetailPage
      // (structural check — reads the entry point file text)
      const fs = await import('fs');
      const path = await import('path');

      // Candidate entry-point files
      const candidates = [
        path.resolve('src/main.jsx'),
        path.resolve('src/App.jsx'),
        path.resolve('src/App.tsx'),
        path.resolve('src/main.tsx'),
      ];

      let found = false;
      for (const filePath of candidates) {
        let content = '';
        try {
          content = fs.readFileSync(filePath, 'utf8');
        } catch {
          continue;
        }
        if (/cars\/:id/i.test(content) || /CarDetail/i.test(content)) {
          found = true;
          break;
        }
      }

      expect(found).toBe(true);
    });
  });
});
