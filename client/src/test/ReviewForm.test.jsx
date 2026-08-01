import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReviewForm from '../components/ReviewForm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderForm(carId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/cars/${carId}`]}>
      <Routes>
        <Route path="/cars/:id" element={<ReviewForm />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockFetchSuccess(body = { id: 10, reviewer_name: 'Test', rating: 5, comment: 'Great car overall.' }) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => body,
  });
}

function mockFetchServerError(status = 500) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: 'Internal server error' }),
  });
}

function mockFetchNetworkError() {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Form rendering
// ---------------------------------------------------------------------------

describe('ReviewForm — renders all required fields', () => {
  it('renders a Name text input', () => {
    renderForm();
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
  });

  it('renders a Star Rating selector with options 1 through 5', () => {
    renderForm();
    // A group of 5 radio buttons OR a <select> with 5 star options is acceptable
    const ratingInputs =
      screen.queryAllByRole('radio').filter(r => /[1-5]/.test(r.value)) ;
    const ratingSelect = screen.queryByRole('combobox', { name: /rating/i }) ||
      screen.queryByRole('listbox', { name: /rating/i });

    const hasRadios = ratingInputs.length === 5;
    const hasSelect = ratingSelect !== null && ratingSelect.querySelectorAll('option').length >= 5;

    expect(hasRadios || hasSelect).toBe(true);
  });

  it('renders a Comment textarea', () => {
    renderForm();
    expect(screen.getByRole('textbox', { name: /comment/i })).toBeInTheDocument();
    // Must actually be a <textarea> for multi-line input
    const comment = screen.getByRole('textbox', { name: /comment/i });
    expect(comment.tagName.toLowerCase()).toBe('textarea');
  });

  it('renders a submit button', () => {
    renderForm();
    expect(
      screen.getByRole('button', { name: /submit/i }) ||
      screen.getByRole('button', { name: /post/i }) ||
      screen.getByRole('button', { name: /review/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Accessibility — labels associated to inputs
// ---------------------------------------------------------------------------

describe('ReviewForm — accessibility', () => {
  it('associates the Name label to its input via htmlFor/id', () => {
    renderForm();
    const input = screen.getByRole('textbox', { name: /name/i });
    // getByRole with name: /name/i only matches if the label is properly associated
    expect(input).toBeInTheDocument();
  });

  it('associates the Rating label to its control via htmlFor/id or aria-label', () => {
    renderForm();
    // The rating control must be reachable by its label text
    const ratingControl =
      screen.queryByRole('combobox', { name: /rating/i }) ||
      screen.queryByRole('group', { name: /rating/i }) ||
      screen.queryByRole('listbox', { name: /rating/i }) ||
      screen.queryAllByRole('radio').find(r => r.closest('[aria-label]') || r.labels?.length > 0);
    expect(ratingControl).toBeTruthy();
  });

  it('associates the Comment label to its textarea via htmlFor/id', () => {
    renderForm();
    const textarea = screen.getByRole('textbox', { name: /comment/i });
    expect(textarea).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Client-side validation — errors shown before fetch
// ---------------------------------------------------------------------------

describe('ReviewForm — client-side validation', () => {
  it('shows an inline error for Name when submitting with an empty name', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm();

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    expect(
      screen.queryByText(/name.*required/i) ||
      screen.queryByText(/enter.*name/i) ||
      screen.queryByText(/name.*empty/i) ||
      screen.queryByText(/name is required/i)
    ).not.toBeNull();
  });

  it('shows an inline error for Star Rating when none is selected', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm();

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    expect(
      screen.queryByText(/rating.*required/i) ||
      screen.queryByText(/select.*rating/i) ||
      screen.queryByText(/choose.*rating/i) ||
      screen.queryByText(/rating is required/i)
    ).not.toBeNull();
  });

  it('shows an inline error for Comment when submitting with empty comment', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm();

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    expect(
      screen.queryByText(/comment.*required/i) ||
      screen.queryByText(/enter.*comment/i) ||
      screen.queryByText(/comment is required/i)
    ).not.toBeNull();
  });

  it('shows a minimum-length error for Comment when fewer than 10 characters are entered', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm();

    const commentEl = screen.getByRole('textbox', { name: /comment/i });
    await user.type(commentEl, 'Too short');

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    expect(
      screen.queryByText(/at least 10/i) ||
      screen.queryByText(/10 characters/i) ||
      screen.queryByText(/too short/i) ||
      screen.queryByText(/minimum.*10/i)
    ).not.toBeNull();
  });

  it('does NOT call fetch when validation fails', async () => {
    const user = userEvent.setup();
    const spy = mockFetchSuccess();
    renderForm();

    // Submit without filling any field
    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows validation errors inline — not just in an alert dialog', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm();

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    // Errors must be visible inline — no modal/alert dialog
    expect(screen.queryByRole('alertdialog')).toBeNull();
    // At least one error must be visible in the document
    const errorText =
      document.querySelector('[data-testid*="error"]') ||
      document.querySelector('[class*="error"]') ||
      document.querySelector('[role="alert"]') ||
      screen.queryByText(/required/i);
    expect(errorText).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Successful submission
// ---------------------------------------------------------------------------

describe('ReviewForm — successful submission', () => {
  it('calls POST /api/cars/:id/reviews with the correct car id from URL params', async () => {
    const user = userEvent.setup();
    const spy = mockFetchSuccess();
    renderForm('42');

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Jane Doe');

    // Select rating 4
    const radios = screen.queryAllByRole('radio');
    if (radios.length > 0) {
      const radio4 = radios.find(r => r.value === '4');
      if (radio4) await user.click(radio4);
      else await user.click(radios[3]);
    } else {
      const select = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(select, '4');
    }

    await user.type(
      screen.getByRole('textbox', { name: /comment/i }),
      'This car is fantastic and I love it.'
    );

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());

    const [url] = spy.mock.calls[0];
    expect(url).toMatch(/\/api\/cars\/42\/reviews/);
  });

  it('sends reviewer_name, rating, and comment in the POST body', async () => {
    const user = userEvent.setup();
    const spy = mockFetchSuccess();
    renderForm('1');

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Alice');

    const radios = screen.queryAllByRole('radio');
    if (radios.length > 0) {
      const radio5 = radios.find(r => r.value === '5');
      if (radio5) await user.click(radio5);
      else await user.click(radios[4]);
    } else {
      const select = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(select, '5');
    }

    await user.type(
      screen.getByRole('textbox', { name: /comment/i }),
      'Absolutely love this car, highly recommend!'
    );

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());

    const [, options] = spy.mock.calls[0];
    expect(options.method).toMatch(/post/i);
    const body = JSON.parse(options.body);
    expect(body.reviewer_name).toBe('Alice');
    expect(body.rating).toBe(5);
    expect(body.comment).toBe('Absolutely love this car, highly recommend!');
  });

  it('clears all form fields after a successful submission', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm('1');

    const nameEl = screen.getByRole('textbox', { name: /name/i });
    const commentEl = screen.getByRole('textbox', { name: /comment/i });

    await user.type(nameEl, 'Bob');

    const radios = screen.queryAllByRole('radio');
    if (radios.length > 0) {
      await user.click(radios[2]);
    } else {
      const select = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(select, '3');
    }

    await user.type(commentEl, 'Solid car for everyday use.');

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    await waitFor(() => {
      expect(nameEl.value).toBe('');
    });

    expect(commentEl.value).toBe('');
  });

  it('shows a confirmation message after a successful submission', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    renderForm('1');

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Carol');

    const radios = screen.queryAllByRole('radio');
    if (radios.length > 0) {
      await user.click(radios[1]);
    } else {
      const select = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(select, '2');
    }

    await user.type(
      screen.getByRole('textbox', { name: /comment/i }),
      'Decent car but nothing spectacular about it.'
    );

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    await waitFor(() => {
      const confirmation =
        screen.queryByText(/thank you/i) ||
        screen.queryByText(/review.*submitted/i) ||
        screen.queryByText(/submitted.*review/i) ||
        screen.queryByText(/success/i) ||
        screen.queryByText(/review.*received/i);
      expect(confirmation).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Network / server error handling
// ---------------------------------------------------------------------------

describe('ReviewForm — error handling', () => {
  async function fillAndSubmit(user) {
    const nameEl = screen.getByRole('textbox', { name: /name/i });
    const commentEl = screen.getByRole('textbox', { name: /comment/i });

    await user.type(nameEl, 'Dave');

    const radios = screen.queryAllByRole('radio');
    if (radios.length > 0) {
      await user.click(radios[0]);
    } else {
      const select = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(select, '1');
    }

    await user.type(commentEl, 'Not my favorite car at all.');

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );
  }

  it('displays a visually prominent error banner on network failure', async () => {
    const user = userEvent.setup();
    mockFetchNetworkError();
    renderForm('1');

    await fillAndSubmit(user);

    await waitFor(() => {
      const banner =
        screen.queryByRole('alert') ||
        document.querySelector('h2') ||
        document.querySelector('[class*="error"]') ||
        document.querySelector('[class*="banner"]');
      expect(banner).not.toBeNull();

      const errorText =
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i) ||
        screen.queryByText(/could not/i) ||
        screen.queryByText(/try again/i) ||
        screen.queryByText(/something went wrong/i);
      expect(errorText).not.toBeNull();
    });
  });

  it('displays a visually prominent error banner on server error (500)', async () => {
    const user = userEvent.setup();
    mockFetchServerError(500);
    renderForm('1');

    await fillAndSubmit(user);

    await waitFor(() => {
      const banner =
        screen.queryByRole('alert') ||
        document.querySelector('h2') ||
        document.querySelector('[class*="error"]') ||
        document.querySelector('[class*="banner"]');
      expect(banner).not.toBeNull();
    });
  });

  it('retains the Name field value after a network error', async () => {
    const user = userEvent.setup();
    mockFetchNetworkError();
    renderForm('1');

    await fillAndSubmit(user);

    await waitFor(() => {
      const banner =
        screen.queryByRole('alert') ||
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i);
      expect(banner).not.toBeNull();
    });

    expect(screen.getByRole('textbox', { name: /name/i }).value).toBe('Dave');
  });

  it('retains the Comment field value after a network error', async () => {
    const user = userEvent.setup();
    mockFetchNetworkError();
    renderForm('1');

    await fillAndSubmit(user);

    await waitFor(() => {
      const banner =
        screen.queryByRole('alert') ||
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i);
      expect(banner).not.toBeNull();
    });

    expect(screen.getByRole('textbox', { name: /comment/i }).value).toBe(
      'Not my favorite car at all.'
    );
  });

  it('retains field values after a server error (non-2xx response)', async () => {
    const user = userEvent.setup();
    mockFetchServerError(500);
    renderForm('1');

    await fillAndSubmit(user);

    await waitFor(() => {
      const hasError =
        screen.queryByRole('alert') ||
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i) ||
        screen.queryByText(/could not/i);
      expect(hasError).not.toBeNull();
    });

    expect(screen.getByRole('textbox', { name: /name/i }).value).toBe('Dave');
    expect(screen.getByRole('textbox', { name: /comment/i }).value).toBe(
      'Not my favorite car at all.'
    );
  });

  it('does not throw an unhandled rejection on network failure', async () => {
    const user = userEvent.setup();
    mockFetchNetworkError();

    expect(() => renderForm('1')).not.toThrow();

    await fillAndSubmit(user);

    // Give time for async error handling to settle
    await waitFor(() => expect(document.body).toBeInTheDocument());
  });

  it('does not show a confirmation message on error', async () => {
    const user = userEvent.setup();
    mockFetchServerError(500);
    renderForm('1');

    await fillAndSubmit(user);

    await waitFor(() => {
      const hasError =
        screen.queryByRole('alert') ||
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i);
      expect(hasError).not.toBeNull();
    });

    expect(screen.queryByText(/thank you/i)).toBeNull();
    expect(screen.queryByText(/review.*submitted/i)).toBeNull();
    expect(screen.queryByText(/success/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// URL params — car id comes from router, not props
// ---------------------------------------------------------------------------

describe('ReviewForm — car id from URL params', () => {
  it('uses the car id from the URL when posting (id=7)', async () => {
    const user = userEvent.setup();
    const spy = mockFetchSuccess();
    renderForm('7');

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Eve');

    const radios = screen.queryAllByRole('radio');
    if (radios.length > 0) {
      await user.click(radios[3]);
    } else {
      const select = screen.getByRole('combobox', { name: /rating/i });
      await user.selectOptions(select, '4');
    }

    await user.type(
      screen.getByRole('textbox', { name: /comment/i }),
      'Excellent performance and comfort throughout.'
    );

    await user.click(
      screen.getByRole('button', { name: /submit|post|review/i })
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());

    const [url] = spy.mock.calls[0];
    expect(url).toMatch(/\/api\/cars\/7\/reviews/);
  });
});
