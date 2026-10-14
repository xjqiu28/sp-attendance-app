import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DailyView from './DailyView.jsx';

const DATA = {
  totalRoster: 2,
  totalSignedIn: 1,
  absentNames: ['John Smith'],
  entries: [
    { name: 'John Smith', signInTime: null, signOutTime: null, status: 'Not Signed In', isLate: false, lateBy: null },
    {
      name: 'Jane Doe',
      signInTime: '10/5/2026 9:20:00 AM',
      signOutTime: null,
      status: 'Signed In',
      isLate: true,
      lateBy: { formatted: '20 minutes' },
    },
  ],
};

describe('DailyView', () => {
  it('feeds only the people who signed in to the Signed In summary', () => {
    render(<DailyView data={DATA} viewMode="card" />);

    const signedIn = screen.getByRole('heading', { name: 'Signed In (1)' }).closest('.summary-list');
    expect(within(signedIn).getAllByRole('listitem')).toHaveLength(1);
    expect(within(signedIn).getByRole('listitem')).toHaveTextContent('Jane Doe');
  });

  it('renders a card for every entry', () => {
    const { container } = render(<DailyView data={DATA} viewMode="card" />);

    expect(container.querySelectorAll('.card-grid .attendance-card')).toHaveLength(2);
  });

  it('uses the list container in list view', () => {
    const { container } = render(<DailyView data={DATA} viewMode="list" />);

    expect(container.querySelectorAll('.entry-list .attendance-row')).toHaveLength(2);
  });
});
