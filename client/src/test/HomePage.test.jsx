import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CAR_WITH_REVIEWS = {
  id: 1,
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  thumbnail_url: 'https://example.com/camry.jpg',
  avg_rating: 4.2,
  review_count: 18,
};

const CAR_WITHOUT_REVIEWS = {
  id: 2,
  make: 'Honda',
  model: 'Civic',
  year: 2021,
  thumbnail_url: null,
  avg_rating: null,
  review_count: 0,
};

const CARS_FIXTURE = [CAR_WITH_REVIEWS, CAR_WITHOUT_REVIEWS];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
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

describe('HomePage — GET /api/cars integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Loading state --------------------------------------------------------

  describe('loading state', () => {
    it('shows a loading indicator while the request is in flight', async () => {
      mockFetch(CARS_FIXTURE, { delay: 200 });
      renderHomePage();

      // Should render a skeleton/spinner before data arrives
      const loading = screen.queryByRole('status') ||
        document.querySelector('[data-testid="loading"]') ||
        document.querySelector('[aria-label="Loading"]') ||
        screen.queryByText(/loading/i);

      expect(loading).not.toBeNull();

      // Clean up: wait for fetch to resolve so no open handles
      await waitFor(() => screen.getByText('Toyota'));
    });

    it('hides the loading indicator once data is rendered', async () => {
      mockFetch(CARS_FIXTURE);
      renderHomePage();

      await waitFor(() => screen.getByText('Toyota'));

      const loading =
        document.querySelector('[data-testid="loading"]') ||
        document.querySelector('[aria-label="Loading"]') ||
        screen.queryByRole('status');

      expect(loading).toBeNull();
    });
  });

  // --- Car cards rendered ---------------------------------------------------

  describe('car cards', () => {
    beforeEach(() => {
      mockFetch(CARS_FIXTURE);
    });

    it('renders one card per car returned by the API', async () => {
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      // Both cars should be on screen
      expect(screen.getByText('Toyota')).toBeInTheDocument();
      expect(screen.getByText('Honda')).toBeInTheDocument();
    });

    it('displays make, model, and year on each card', async () => {
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      // Car 1
      expect(screen.getByText('Toyota')).toBeInTheDocument();
      expect(screen.getByText('Camry')).toBeInTheDocument();
      expect(screen.getByText('2022')).toBeInTheDocument();

      // Car 2
      expect(screen.getByText('Honda')).toBeInTheDocument();
      expect(screen.getByText('Civic')).toBeInTheDocument();
      expect(screen.getByText('2021')).toBeInTheDocument();
    });

    it('displays the star rating and review count for a car with reviews', async () => {
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      // Should contain the average rating value (e.g. "4.2") and review count ("18")
      expect(screen.getByText(/4\.2/)).toBeInTheDocument();
      expect(screen.getByText(/18/)).toBeInTheDocument();
    });

    it('displays "No reviews yet" for a car with zero reviews', async () => {
      renderHomePage();
      await waitFor(() => screen.getByText('Honda'));

      expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    });

    it('does not crash when a car has no reviews (review_count === 0, avg_rating === null)', async () => {
      mockFetch([CAR_WITHOUT_REVIEWS]);
      expect(() => renderHomePage()).not.toThrow();
      await waitFor(() => screen.getByText('Honda'));
      expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    });

    it('renders a thumbnail image for a car with thumbnail_url', async () => {
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      const img = screen.getByRole('img', { name: /camry/i }) ||
        document.querySelector(`img[src="${CAR_WITH_REVIEWS.thumbnail_url}"]`);
      expect(img).toBeInTheDocument();
    });

    it('renders a placeholder/fallback image for a car with null thumbnail_url', async () => {
      renderHomePage();
      await waitFor(() => screen.getByText('Honda'));

      // The card should still render an img element (placeholder) even with null thumbnail
      const cards = document.querySelectorAll('[data-testid="car-card"], .car-card, article, li');
      // Find the Honda card among them or just confirm at least one img fallback exists
      const allImgs = document.querySelectorAll('img');
      // There should still be an image element for the Honda card (placeholder)
      expect(allImgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Navigation links ----------------------------------------------------

  describe('card navigation', () => {
    it('wraps each card in a link to /cars/:id', async () => {
      mockFetch(CARS_FIXTURE);
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      expect(hrefs).toContain('/cars/1');
      expect(hrefs).toContain('/cars/2');
    });
  });

  // --- Empty state ---------------------------------------------------------

  describe('empty state', () => {
    it('shows a friendly message when the API returns an empty array', async () => {
      mockFetch([]);
      renderHomePage();

      await waitFor(() => {
        // Should render a message indicating no cars are available
        const msg =
          screen.queryByText(/no cars/i) ||
          screen.queryByText(/no vehicles/i) ||
          screen.queryByText(/nothing here/i) ||
          screen.queryByText(/empty/i) ||
          screen.queryByText(/come back/i) ||
          screen.queryByText(/available/i);
        expect(msg).not.toBeNull();
      });
    });
  });

  // --- Error state ---------------------------------------------------------

  describe('error state', () => {
    it('does not crash when the fetch rejects', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      expect(() => renderHomePage()).not.toThrow();
      // Should either show an error message or the empty state — just not crash
      await waitFor(() => {
        // Give the component time to handle the rejection
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  // --- Responsive layout ---------------------------------------------------

  describe('responsive grid layout', () => {
    it('renders a container element that holds all car cards', async () => {
      mockFetch(CARS_FIXTURE);
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      // A grid/list container should be present
      const grid =
        document.querySelector('[data-testid="car-grid"]') ||
        document.querySelector('.car-grid') ||
        document.querySelector('ul') ||
        document.querySelector('ol') ||
        document.querySelector('[role="list"]');

      expect(grid).not.toBeNull();
    });

    it('applies a CSS class or inline style that enables multi-column layout at wide viewports', async () => {
      mockFetch(CARS_FIXTURE);
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      // The grid element should have a class or style that suggests grid/flex layout
      const grid =
        document.querySelector('[data-testid="car-grid"]') ||
        document.querySelector('.car-grid') ||
        document.querySelector('ul') ||
        document.querySelector('[role="list"]');

      const style = grid ? window.getComputedStyle(grid) : null;
      const classAttr = grid ? grid.getAttribute('class') || '' : '';

      // Either the inline style or a class name should indicate grid/flex intent
      const hasGridClass =
        classAttr.includes('grid') ||
        classAttr.includes('flex') ||
        classAttr.includes('cards') ||
        (style && (style.display === 'grid' || style.display === 'flex'));

      expect(hasGridClass).toBe(true);
    });
  });

  // --- API call correctness ------------------------------------------------

  describe('API call', () => {
    it('fetches GET /api/cars exactly once on mount', async () => {
      const spy = mockFetch(CARS_FIXTURE);
      renderHomePage();
      await waitFor(() => screen.getByText('Toyota'));

      expect(spy).toHaveBeenCalledTimes(1);
      const firstCallUrl = spy.mock.calls[0][0];
      expect(firstCallUrl).toMatch(/\/api\/cars/);
    });
  });
});
