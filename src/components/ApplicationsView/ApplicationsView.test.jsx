import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationsView from './ApplicationsView.jsx';

const IDLE = { loading: false, message: null, error: null };

const APPLICANT = {
  firstName: 'Jane',
  lastName: 'Doe',
  title: 'Counselor',
  dateInformation: '',
  time: '',
  rate: null,
  email: 'jane.doe@example.com',
  sent: '',
  paidHours: '',
  volunteerHours: '',
  missingDocuments: '',
  acceptDecline: '',
  ss: '',
  w4Forms: '',
};

function renderView(overrides = {}) {
  const props = {
    data: { applications: [APPLICANT, { ...APPLICANT, firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com' }] },
    loading: false,
    error: null,
    syncState: IDLE,
    onSync: vi.fn(),
    onUpdateApplication: vi.fn(),
    offerLettersState: IDLE,
    onSendOfferLetters: vi.fn(),
    offerRepliesState: IDLE,
    onCheckOfferReplies: vi.fn(),
    viewMode: 'card',
    ...overrides,
  };
  return { props, ...render(<ApplicationsView {...props} />) };
}

describe('ApplicationsView', () => {
  it('renders a card per applicant', () => {
    renderView();

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it.each([
    ['Sync Scheduled Times', 'onSync'],
    ['Send Offer Letters', 'onSendOfferLetters'],
    ['Check Replies', 'onCheckOfferReplies'],
  ])('calls the right handler for %s', async (label, handler) => {
    const { props } = renderView();

    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(props[handler]).toHaveBeenCalledTimes(1);
  });

  it('disables each toolbar button with a progress label while it runs', () => {
    renderView({
      syncState: { ...IDLE, loading: true },
      offerLettersState: { ...IDLE, loading: true },
      offerRepliesState: { ...IDLE, loading: true },
    });

    expect(screen.getByRole('button', { name: 'Syncing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
  });

  it('shows each action’s success or error message', () => {
    renderView({
      syncState: { ...IDLE, message: 'Synced 2 people.' },
      offerLettersState: { ...IDLE, error: 'Not authorized.' },
      offerRepliesState: { ...IDLE, message: 'No new replies found.' },
    });

    expect(screen.getByText('Synced 2 people.')).toHaveClass('applications-sync-message', 'success');
    expect(screen.getByText('Not authorized.')).toHaveClass('applications-sync-message', 'error');
    expect(screen.getByText('No new replies found.')).toHaveClass('applications-sync-message', 'success');
  });

  it('shows a loading message instead of the cards', () => {
    renderView({ loading: true });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('shows an error', () => {
    renderView({ data: null, error: 'Could not open the Applications sheet.' });

    expect(screen.getByText('Could not open the Applications sheet.')).toHaveClass('error');
  });
});
