import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttendanceCard from './AttendanceCard.jsx';

const ENTRY = {
  name: 'Jane Doe',
  signInTime: '10/5/2026 9:02:00 AM',
  signOutTime: '10/5/2026 3:00:00 PM',
  totalHoursFormatted: '5 hours and 58 minutes',
  status: 'Complete',
  isLate: false,
  workHours: '9:00 AM - 3:00 PM',
  workHoursNotes: [],
};

// Each row is <label span><value span>.
function rowValue(label) {
  return screen.getByText(label).nextElementSibling;
}

describe('AttendanceCard', () => {
  it("shows the person's name, times, total and work hours", () => {
    render(<AttendanceCard entry={ENTRY} viewMode="card" />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(rowValue('Work Hours')).toHaveTextContent('9:00 AM - 3:00 PM');
    expect(rowValue('Sign In')).toHaveTextContent('10/5/2026 9:02:00 AM');
    expect(rowValue('Sign Out')).toHaveTextContent('10/5/2026 3:00:00 PM');
    expect(rowValue('Total Hours')).toHaveTextContent('5 hours and 58 minutes');
  });

  it('shows dashes for missing times and leaves out an empty Work Hours row', () => {
    render(
      <AttendanceCard
        entry={{ ...ENTRY, signInTime: null, signOutTime: null, totalHoursFormatted: null, workHours: null, status: 'Not Signed In' }}
        viewMode="card"
      />
    );

    expect(screen.queryByText('Work Hours')).not.toBeInTheDocument();
    expect(rowValue('Sign In')).toHaveTextContent('—');
    expect(rowValue('Sign Out')).toHaveTextContent('—');
    expect(rowValue('Total Hours')).toHaveTextContent('—');
  });

  it.each([
    ['Complete', 'status-complete'],
    ['Signed In', 'status-signed-in'],
    ['Not Signed In', 'status-not-signed-in'],
  ])('styles the %s status badge', (status, className) => {
    render(<AttendanceCard entry={{ ...ENTRY, status }} viewMode="card" />);

    expect(screen.getByText(status)).toHaveClass('badge', className);
  });

  it('shows a Late badge only for a late sign-in', () => {
    const { rerender } = render(<AttendanceCard entry={ENTRY} viewMode="card" />);
    expect(screen.queryByText('Late')).not.toBeInTheDocument();

    rerender(<AttendanceCard entry={{ ...ENTRY, isLate: true }} viewMode="card" />);
    expect(screen.getByText('Late')).toHaveClass('badge', 'status-late');
  });

  it('uses the row layout in list view and the card layout otherwise', () => {
    const { container, rerender } = render(<AttendanceCard entry={ENTRY} viewMode="list" />);
    expect(container.firstChild).toHaveClass('attendance-row');

    rerender(<AttendanceCard entry={ENTRY} viewMode="card" />);
    expect(container.firstChild).toHaveClass('attendance-card');
  });

  it('shows Work Hours notes', () => {
    render(
      <AttendanceCard
        entry={{ ...ENTRY, workHoursNotes: [{ type: 'arrived-early', text: 'Arrived 2 minutes early' }] }}
        viewMode="card"
      />
    );

    expect(screen.getByText('Arrived 2 minutes early')).toBeInTheDocument();
  });
});
