import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttendanceForm from './AttendanceForm.jsx';
import { submitAttendance } from '../../api/attendanceApi.js';

vi.mock('../../api/attendanceApi.js', () => ({ submitAttendance: vi.fn() }));

const NAMES = ['John Smith', 'Jane Doe'];

function renderForm() {
  return render(<AttendanceForm names={NAMES} namesLoading={false} namesLoadFailed={false} />);
}

async function fillIn(name, code) {
  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(screen.getByRole('option', { name }));
  await userEvent.type(screen.getByLabelText('Personal Code'), code);
}

describe('AttendanceForm', () => {
  beforeEach(() => {
    submitAttendance.mockReset();
  });

  it('uses the searchable name field', () => {
    renderForm();

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('asks for a name and code before sending anything', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Please select your name and enter your personal code.')).toBeInTheDocument();
    expect(submitAttendance).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed code and clears it on success', async () => {
    submitAttendance.mockResolvedValue({ success: true, message: 'Signed in at 9:00 AM.' });
    renderForm();

    await fillIn('Jane Doe', ' 1234 ');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(submitAttendance).toHaveBeenCalledWith('Jane Doe', '1234', 'in');
    expect(await screen.findByText('Signed in at 9:00 AM.')).toHaveClass('success');
    expect(screen.getByLabelText('Personal Code')).toHaveValue('');
  });

  it('signs out when Sign Out is pressed', async () => {
    submitAttendance.mockResolvedValue({ success: true, message: 'Signed out.' });
    renderForm();

    await fillIn('John Smith', '99');
    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(submitAttendance).toHaveBeenCalledWith('John Smith', '99', 'out');
  });

  it('shows the error the backend returns and keeps the code', async () => {
    submitAttendance.mockResolvedValue({ success: false, error: 'Incorrect personal code for that name.' });
    renderForm();

    await fillIn('John Smith', '00');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Incorrect personal code for that name.')).toHaveClass('error');
    expect(screen.getByLabelText('Personal Code')).toHaveValue('00');
  });

  it('warns to check the sheet when the request times out', async () => {
    submitAttendance.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    renderForm();

    await fillIn('John Smith', '99');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(
      await screen.findByText(
        'This is taking too long. Please check the sheet before submitting again — your entry may have already gone through.'
      )
    ).toBeInTheDocument();
  });

  it('reports a network error', async () => {
    submitAttendance.mockRejectedValue(new TypeError('Failed to fetch'));
    renderForm();

    await fillIn('John Smith', '99');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Network error — please try again.')).toBeInTheDocument();
  });
});
