import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEntryCard from './EditEntryCard.tsx';

const ENTRY = {
  name: 'Jane Doe',
  signInTime: '10/5/2026 9:05:00 AM',
  signOutTime: '10/5/2026 3:30:00 PM',
  sessions: null,
};

describe('EditEntryCard', () => {
  it("fills the time fields from the entry's sign-in and sign-out", () => {
    render(<EditEntryCard entry={ENTRY} onSave={vi.fn()} viewMode="card" />);

    expect(screen.getByLabelText('Sign In')).toHaveValue('09:05');
    expect(screen.getByLabelText('Sign Out')).toHaveValue('15:30');
  });

  it('leaves the fields blank when nothing was recorded', () => {
    render(<EditEntryCard entry={{ ...ENTRY, signInTime: null, signOutTime: null }} onSave={vi.fn()} viewMode="card" />);

    expect(screen.getByLabelText('Sign In')).toHaveValue('');
    expect(screen.getByLabelText('Sign Out')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('lists the separate sessions of a day someone stepped out', () => {
    render(
      <EditEntryCard
        entry={{
          ...ENTRY,
          sessions: [
            { signInTime: '10/5/2026 9:05:00 AM', signOutTime: '10/5/2026 12:00:00 PM' },
            { signInTime: '10/5/2026 1:00:00 PM', signOutTime: null },
          ],
        }}
        onSave={vi.fn()}
        viewMode="card"
      />
    );

    expect(screen.getByText(/Stepped out and came back: 9:05 AM – 12:00 PM, 1:00 PM – —/)).toBeInTheDocument();
  });

  it('saves the edited times', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(<EditEntryCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.clear(screen.getByLabelText('Sign Out'));
    await userEvent.type(screen.getByLabelText('Sign Out'), '16:00');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Jane Doe', '09:05', '16:00');
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows the error when saving fails', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Sign-out time must be after sign-in time.' });
    render(<EditEntryCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Sign-out time must be after sign-in time.')).toHaveClass('error');
  });

  it('clears the entry with blank times', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(<EditEntryCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onSave).toHaveBeenCalledWith('Jane Doe', '', '');
    expect(await screen.findByText('Cleared.')).toBeInTheDocument();
    expect(screen.getByLabelText('Sign In')).toHaveValue('');
    expect(screen.getByLabelText('Sign Out')).toHaveValue('');
  });

  it('keeps the times when clearing fails', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Not authorized.' });
    render(<EditEntryCard entry={ENTRY} onSave={onSave} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(await screen.findByText('Not authorized.')).toBeInTheDocument();
    expect(screen.getByLabelText('Sign In')).toHaveValue('09:05');
  });
});
