import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyView from './WeeklyView.jsx';

const DATA = {
  weekNumber: 2,
  weekStart: '10/5/2026',
  availableWeeks: [
    { weekNumber: 1, label: 'Week 1 (9/28 - 10/3)' },
    { weekNumber: 2, label: 'Week 2 (10/5 - 10/10)' },
  ],
  entries: [
    { name: 'John Smith', weekTotalFormatted: '10 hours and 0 minutes', overCap: false, approval: null, days: [] },
    { name: 'Jane Doe', weekTotalFormatted: '12 hours and 0 minutes', overCap: false, approval: null, days: [] },
  ],
};

function renderView(overrides = {}) {
  const props = {
    data: DATA,
    viewMode: 'card',
    onWeekChange: vi.fn(),
    onApproveWeek: vi.fn(),
    onUnapproveWeek: vi.fn(),
    onGenerateReport: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<WeeklyView {...props} />) };
}

describe('WeeklyView', () => {
  it('shows the week picker, report panel and a card per person', () => {
    renderView();

    expect(screen.getByRole('button', { name: 'Week 2 (10/5 - 10/10)' })).toHaveClass('active');
    expect(screen.getByText('Report for 10/5 - 10/9 (Mon-Fri)')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('calls onWeekChange when another week is picked', async () => {
    const { props } = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Week 1 (9/28 - 10/3)' }));

    expect(props.onWeekChange).toHaveBeenCalledWith(1);
  });

  it('uses the list container in list view', () => {
    const { container } = renderView({ viewMode: 'list' });

    expect(container.querySelector('.entry-list')).toBeInTheDocument();
    expect(container.querySelector('.card-grid')).not.toBeInTheDocument();
  });
});
