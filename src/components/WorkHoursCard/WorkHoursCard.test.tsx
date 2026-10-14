import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkHoursCard from './WorkHoursCard.tsx';

const ENTRY = { name: 'Jane Doe', workHours: '9:00 AM - 3:00 PM', startTime: '09:00', endTime: '15:00' };

describe('WorkHoursCard', () => {
  it('fills in the current start and end times', () => {
    render(<WorkHoursCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);

    expect(screen.getByLabelText('Start Time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End Time')).toHaveValue('15:00');
  });

  it('warns when the current Work Hours could not be read', () => {
    render(
      <WorkHoursCard entry={{ ...ENTRY, workHours: 'mornings', startTime: '', endTime: '' }} onSave={vi.fn()} viewMode="card" />
    );

    expect(screen.getByText('Current value "mornings" isn\'t in a recognized format. Saving replaces it.')).toBeInTheDocument();
  });

  it('does not warn for a readable value or an empty one', () => {
    const { rerender } = render(<WorkHoursCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);
    expect(screen.queryByText(/isn't in a recognized format/)).not.toBeInTheDocument();

    rerender(<WorkHoursCard entry={{ ...ENTRY, workHours: null, startTime: '', endTime: '' }} onSave={vi.fn()} viewMode="card" />);
    expect(screen.queryByText(/isn't in a recognized format/)).not.toBeInTheDocument();
  });

  it('saves the edited times', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(<WorkHoursCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.clear(screen.getByLabelText('End Time'));
    await userEvent.type(screen.getByLabelText('End Time'), '16:30');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Jane Doe', '09:00', '16:30');
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows the error when saving fails', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: 'End time must be after start time.' });
    render(<WorkHoursCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('End time must be after start time.')).toHaveClass('error');
  });

  it('clears the work hours', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(<WorkHoursCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onSave).toHaveBeenCalledWith('Jane Doe', '', '');
    expect(await screen.findByText('Cleared.')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Time')).toHaveValue('');
  });

  it('disables Clear when there is nothing to clear', () => {
    render(<WorkHoursCard entry={{ ...ENTRY, workHours: null, startTime: '', endTime: '' }} onSave={vi.fn()} viewMode="card" />);

    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('allows clearing an unreadable value', () => {
    render(
      <WorkHoursCard entry={{ ...ENTRY, workHours: 'mornings', startTime: '', endTime: '' }} onSave={vi.fn()} viewMode="card" />
    );

    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled();
  });
});
