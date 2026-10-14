import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyTotalCard from './WeeklyTotalCard.jsx';

const ENTRY = {
  name: 'John Smith',
  weekTotalFormatted: '22 hours and 0 minutes',
  workHours: '9:00 AM - 3:00 PM',
  overCap: false,
  maxWeeklyHours: null,
  approval: null,
  days: [
    {
      date: '10/5/2026',
      label: 'Monday',
      signInTime: '10/5/2026 9:00:00 AM',
      signOutTime: '10/5/2026 3:00:00 PM',
      hoursFormatted: '6 hours and 0 minutes',
      workHoursNotes: [],
    },
    {
      date: '10/6/2026',
      label: 'Tuesday',
      signInTime: '10/6/2026 9:30:00 AM',
      signOutTime: null,
      hoursFormatted: null,
      workHoursNotes: [{ type: 'arrived-late', text: 'Arrived 30 minutes late' }],
    },
    { date: '10/7/2026', label: 'Wednesday', signInTime: null, signOutTime: null, hoursFormatted: null, workHoursNotes: [] },
  ],
};

const OVER_CAP = { ...ENTRY, overCap: true, maxWeeklyHours: 20 };

function renderCard(entry, handlers = {}) {
  return render(
    <WeeklyTotalCard
      entry={entry}
      viewMode="card"
      weekStart="10/5/2026"
      onApprove={handlers.onApprove || vi.fn()}
      onUnapprove={handlers.onUnapprove || vi.fn()}
    />
  );
}

describe('WeeklyTotalCard', () => {
  it('shows the name, week total and work hours', () => {
    renderCard(ENTRY);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('22 hours and 0 minutes')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM - 3:00 PM')).toBeInTheDocument();
  });

  it('expands to a day-by-day breakdown when clicked, and collapses again', async () => {
    renderCard(ENTRY);
    expect(screen.queryByText('Monday')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('John Smith'));

    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM - 3:00 PM', { selector: '.weekly-breakdown-top span' })).toBeInTheDocument();
    expect(screen.getByText('6 hours and 0 minutes')).toBeInTheDocument();
    expect(screen.getByText('9:30 AM - —')).toBeInTheDocument();
    expect(screen.getByText('Arrived 30 minutes late')).toBeInTheDocument();
    expect(screen.getByText('Not signed in')).toBeInTheDocument();

    await userEvent.click(screen.getByText('John Smith'));
    expect(screen.queryByText('Monday')).not.toBeInTheDocument();
  });

  it('expands with the keyboard', async () => {
    renderCard(ENTRY);

    screen.getByRole('button', { name: /John Smith/ }).focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByText('Monday')).toBeInTheDocument();
  });

  it('shows no approval section when the week is under the cap', () => {
    renderCard(ENTRY);

    expect(screen.queryByText('Needs Approval')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('asks for approval when the week is over the cap', () => {
    renderCard(OVER_CAP);

    expect(screen.getByText('Needs Approval')).toBeInTheDocument();
    expect(screen.getByText('Cap: 20 hrs/week')).toBeInTheDocument();
  });

  it('approves without expanding the card', async () => {
    const onApprove = vi.fn().mockResolvedValue({ success: true });
    renderCard(OVER_CAP, { onApprove });

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(onApprove).toHaveBeenCalledWith('John Smith', '10/5/2026');
    expect(screen.queryByText('Monday')).not.toBeInTheDocument();
  });

  it('shows the error when approving fails', async () => {
    const onApprove = vi.fn().mockResolvedValue({ success: false, error: 'Not authorized.' });
    renderCard(OVER_CAP, { onApprove });

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Not authorized.')).toBeInTheDocument();
  });

  it('shows who approved it and lets a director unapprove', async () => {
    const onUnapprove = vi.fn().mockResolvedValue({ success: true });
    renderCard({ ...OVER_CAP, approval: { approvedBy: 'Alex Kim', approvedAt: '10/9/2026 4:00 PM' } }, { onUnapprove });

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Approved by Alex Kim on 10/9/2026 4:00 PM')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Unapprove' }));

    expect(onUnapprove).toHaveBeenCalledWith('John Smith', '10/5/2026');
  });
});
