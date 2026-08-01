/**
 * Acceptance tests for the Car Detail page UI.
 *
 * These tests are RED until the frontend is implemented. They require:
 *   - @testing-library/react and @testing-library/jest-dom installed
 *   - Jest configured to transform JSX (babel-jest + @babel/preset-react)
 *   - React component exported from src/frontend/CarDetail.js(x)
 */

const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');

// The component under test – does not exist yet (test will be red).
const CarDetailModule = require('../src/frontend/CarDetail');
const CarDetail = CarDetailModule.default || CarDetailModule;

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const CAR_WITH_REVIEWS = {
  id: 1,
  make: 'Toyota',
  model: 'Camry',
  year: 2021,
  description: 'A reliable family sedan.',
  averageRating: 4.2,
  reviewCount: 12,
};

const CAR_NO_REVIEWS = {
  id: 2,
  make: 'Honda',
  model: 'Civic',
  year: 2019,
  description: 'A compact car.',
  averageRating: null,
  reviewCount: 0,
};

function mockFetchSuccess(data) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    })
  );
}

function mockFetch404() {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Car not found.' }),
    })
  );
}

afterEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Car found – with reviews
// ---------------------------------------------------------------------------

describe('CarDetail – car found (with reviews)', () => {
  beforeEach(async () => {
    mockFetchSuccess(CAR_WITH_REVIEWS);
    render(React.createElement(CarDetail, { carId: 1 }));
    await waitFor(() => {
      if (!screen.queryByText(/toyota/i)) {
        throw new Error('Car data not yet rendered');
      }
    });
  });

  it('displays the car make', () => {
    expect(screen.getByText(/toyota/i)).toBeInTheDocument();
  });

  it('displays the car model', () => {
    expect(screen.getByText(/camry/i)).toBeInTheDocument();
  });

  it('displays the car year', () => {
    expect(screen.getByText(/2021/)).toBeInTheDocument();
  });

  it('displays the car description', () => {
    expect(screen.getByText(/reliable family sedan/i)).toBeInTheDocument();
  });

  it('displays averageRating formatted as "4.2 / 5"', () => {
    // Must contain the pattern "4.2 / 5" (whitespace flexible)
    expect(screen.getByText(/4\.2\s*\/\s*5/)).toBeInTheDocument();
  });

  it('displays reviewCount as "12 reviews"', () => {
    expect(screen.getByText(/12\s+reviews/i)).toBeInTheDocument();
  });

  it('renders a "Write a Review" button or link', () => {
    const el =
      screen.queryByRole('button', { name: /write a review/i }) ||
      screen.queryByRole('link', { name: /write a review/i }) ||
      screen.queryByText(/write a review/i);
    expect(el).toBeInTheDocument();
  });

  it('does not render "Car not found"', () => {
    expect(screen.queryByText(/car not found/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Car found – no reviews
// ---------------------------------------------------------------------------

describe('CarDetail – car found (no reviews)', () => {
  beforeEach(async () => {
    mockFetchSuccess(CAR_NO_REVIEWS);
    render(React.createElement(CarDetail, { carId: 2 }));
    await waitFor(() => {
      if (!screen.queryByText(/honda/i)) {
        throw new Error('Car data not yet rendered');
      }
    });
  });

  it('displays the car make', () => {
    expect(screen.getByText(/honda/i)).toBeInTheDocument();
  });

  it('displays the car model', () => {
    expect(screen.getByText(/civic/i)).toBeInTheDocument();
  });

  it('displays the car year', () => {
    expect(screen.getByText(/2019/)).toBeInTheDocument();
  });

  it('displays "0 reviews"', () => {
    expect(screen.getByText(/0\s+reviews/i)).toBeInTheDocument();
  });

  it('does not display a "/ 5" rating when averageRating is null', () => {
    expect(screen.queryByText(/\/\s*5/)).not.toBeInTheDocument();
  });

  it('still renders a "Write a Review" button or link', () => {
    const el =
      screen.queryByRole('button', { name: /write a review/i }) ||
      screen.queryByRole('link', { name: /write a review/i }) ||
      screen.queryByText(/write a review/i);
    expect(el).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 404 / car not found
// ---------------------------------------------------------------------------

describe('CarDetail – 404 / car not found', () => {
  it('renders a "Car not found" message when the API returns 404', async () => {
    mockFetch404();
    render(React.createElement(CarDetail, { carId: 99999 }));
    await waitFor(() => {
      if (!screen.queryByText(/car not found/i)) {
        throw new Error('"Car not found" not yet rendered');
      }
    });
    expect(screen.getByText(/car not found/i)).toBeInTheDocument();
  });

  it('does not render car data fields when the API returns 404', async () => {
    mockFetch404();
    render(React.createElement(CarDetail, { carId: 99999 }));
    await waitFor(() => {
      if (!screen.queryByText(/car not found/i)) {
        throw new Error('"Car not found" not yet rendered');
      }
    });
    expect(screen.queryByText(/toyota/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/\s*5/)).not.toBeInTheDocument();
  });

  it('does not throw synchronously when the API returns 404', () => {
    mockFetch404();
    expect(() => {
      render(React.createElement(CarDetail, { carId: 99999 }));
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// API wiring
// ---------------------------------------------------------------------------

describe('CarDetail – API call', () => {
  it('calls GET /api/cars/:id with the correct id', async () => {
    mockFetchSuccess(CAR_WITH_REVIEWS);
    render(React.createElement(CarDetail, { carId: 1 }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/api\/cars\/1/);
  });
});
