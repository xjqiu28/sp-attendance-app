import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekSelector from './WeekSelector.jsx';

const WEEKS = [
  { weekNumber: 1, label: 'Week 1 (9/28 - 10/3)' },
  { weekNumber: 2, label: 'Week 2 (10/5 - 10/10)' },
];

describe('WeekSelector', () => {
  it('renders nothing without weeks', () => {
    expect(render(<WeekSelector availableWeeks={[]} onSelect={() => {}} />).container).toBeEmptyDOMElement();
    expect(render(<WeekSelector availableWeeks={undefined} onSelect={() => {}} />).container).toBeEmptyDOMElement();
  });

  it('renders a button per week and marks the current one', () => {
    render(<WeekSelector availableWeeks={WEEKS} currentWeekNumber={2} onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: 'Week 2 (10/5 - 10/10)' })).toHaveClass('week-button', 'active');
    expect(screen.getByRole('button', { name: 'Week 1 (9/28 - 10/3)' })).not.toHaveClass('active');
  });

  it('calls onSelect with the clicked week number', async () => {
    const onSelect = vi.fn();
    render(<WeekSelector availableWeeks={WEEKS} currentWeekNumber={2} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Week 1 (9/28 - 10/3)' }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
