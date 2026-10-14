import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DailyView from './DailyView.tsx';
import type { DailyView as DailyViewData } from '@/api/attendanceApi.ts';

const DATA: DailyViewData = {
  date: '10/5/2026',
  totalRoster: 2,
  totalSignedIn: 1,
  absentNames: ['John Smith'],
  entries: [
    {
      name: 'John Smith',
      signInTime: null,
      signOutTime: null,
      totalHoursDecimal: null,
      totalHoursFormatted: null,
      status: 'Not Signed In',
      isLate: false,
      lateBy: null,
      workHours: null,
      workHoursNotes: [],
    },
    {
      name: 'Jane Doe',
      signInTime: '10/5/2026 9:20:00 AM',
      signOutTime: null,
      totalHoursDecimal: null,
      totalHoursFormatted: null,
      status: 'Signed In',
      isLate: true,
      lateBy: { hours: 0, minutes: 20, formatted: '20 minutes' },
      workHours: null,
      workHoursNotes: [],
    },
  ],
  lateNames: [{ name: 'Jane Doe', lateBy: '20 minutes' }],
};

describe('DailyView', () => {
  it('feeds only the people who signed in to the Signed In summary', () => {
    render(<DailyView data={DATA} viewMode="card" />);

    const signedIn = screen.getByRole('heading', { name: 'Signed In (1)' }).closest('.summary-list') as HTMLElement;
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
