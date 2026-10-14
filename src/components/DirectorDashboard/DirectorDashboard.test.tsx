import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DirectorDashboard from './DirectorDashboard.tsx';
import * as api from '../../api/attendanceApi.ts';

vi.mock('../../api/attendanceApi.ts', () => ({
  getDirectorView: vi.fn(),
  getWorkHoursView: vi.fn(),
  addStaff: vi.fn(),
  generatePersonalCodes: vi.fn(),
  generateReport: vi.fn(),
  getEditDayView: vi.fn(),
  updateAttendanceEntry: vi.fn(),
  updateWorkHours: vi.fn(),
  approveWeek: vi.fn(),
  unapproveWeek: vi.fn(),
  getApplicationsView: vi.fn(),
  updateApplication: vi.fn(),
  syncScheduledTimes: vi.fn(),
  sendOfferLetters: vi.fn(),
  checkOfferReplies: vi.fn(),
}));

const getDirectorView = api.getDirectorView as Mock;
const getWorkHoursView = api.getWorkHoursView as Mock;
const addStaff = api.addStaff as Mock;

const DAILY = {
  success: true,
  date: '10/12/2026',
  totalRoster: 2,
  totalSignedIn: 1,
  absentNames: ['John Smith'],
  entries: [
    { name: 'Jane Doe', signInTime: '10/12/2026 9:00:00 AM', signOutTime: null, status: 'Signed In', isLate: false, lateBy: null },
    { name: 'John Smith', signInTime: null, signOutTime: null, status: 'Not Signed In', isLate: false, lateBy: null },
  ],
};

const WORK_HOURS = {
  success: true,
  entries: [{ name: 'Jane Doe', workHours: '9:00 AM - 3:00 PM', startTime: '09:00', endTime: '15:00' }],
};

function renderDashboard(onRosterChange = vi.fn()) {
  render(<DirectorDashboard names={['Alex Kim']} namesLoading={false} namesLoadFailed={false} onRosterChange={onRosterChange} />);
  return onRosterChange;
}

async function logIn() {
  await userEvent.selectOptions(screen.getByLabelText('Full Name'), 'Alex Kim');
  await userEvent.type(screen.getByLabelText('Personal Code'), '1234');
  await userEvent.click(screen.getByRole('button', { name: 'View Dashboard' }));
}

describe('DirectorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts at the login card, listing the names it is given', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Director View' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alex Kim' })).toBeInTheDocument();
  });

  it('asks for a name and code before checking', async () => {
    renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: 'View Dashboard' }));

    expect(screen.getByText('Please select your name and enter your personal code.')).toBeInTheDocument();
    expect(getDirectorView).not.toHaveBeenCalled();
  });

  it('shows the error when login is refused', async () => {
    getDirectorView.mockResolvedValue({ success: false, error: 'This account is not authorized to view this page.' });
    renderDashboard();

    await logIn();

    expect(getDirectorView).toHaveBeenCalledWith('Alex Kim', '1234', 'daily');
    expect(await screen.findByText('This account is not authorized to view this page.')).toBeInTheDocument();
  });

  it("shows today's attendance after logging in", async () => {
    getDirectorView.mockResolvedValue(DAILY);
    renderDashboard();

    await logIn();

    expect(await screen.findByRole('heading', { name: 'Attendance — 10/12/2026' })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('loads the Staff tab when it is opened', async () => {
    getDirectorView.mockResolvedValue(DAILY);
    getWorkHoursView.mockResolvedValue(WORK_HOURS);
    renderDashboard();
    await logIn();
    await screen.findByRole('heading', { name: 'Attendance — 10/12/2026' });

    await userEvent.click(screen.getByRole('button', { name: 'Staff' }));

    expect(getWorkHoursView).toHaveBeenCalledWith('Alex Kim', '1234');
    expect(screen.getByRole('heading', { name: 'Staff' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Start Time')).toHaveValue('09:00');
  });

  it('adds staff, shows them in the list and tells the app the roster changed', async () => {
    getDirectorView.mockResolvedValue(DAILY);
    getWorkHoursView.mockResolvedValue(WORK_HOURS);
    addStaff.mockResolvedValue({
      success: true,
      message: 'Added John Smith. Their personal code is A1.',
      entry: { name: 'John Smith', workHours: null, startTime: '', endTime: '' },
    });
    const onRosterChange = renderDashboard();
    await logIn();
    await screen.findByRole('heading', { name: 'Attendance — 10/12/2026' });
    await userEvent.click(screen.getByRole('button', { name: 'Staff' }));
    await screen.findByLabelText('Start Time');

    await userEvent.click(screen.getByRole('button', { name: '+ Add Staff' }));
    await userEvent.type(screen.getByLabelText('Name *'), 'John Smith');
    await userEvent.type(screen.getByLabelText('Personal Code'), 'A1');
    await userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(await screen.findByText('Added John Smith. Their personal code is A1.')).toBeInTheDocument();
    expect(addStaff).toHaveBeenCalledWith('Alex Kim', '1234', expect.objectContaining({ name: 'John Smith', personalCode: 'A1' }));
    expect(screen.getAllByLabelText('Start Time')).toHaveLength(2);
    expect(onRosterChange).toHaveBeenCalledTimes(1);
  });

  it('shows the error, not a blank screen, when the Weekly tab fails to load', async () => {
    getDirectorView.mockImplementation((_name: string, _code: string, view: string) =>
      Promise.resolve(view === 'weekly' ? { success: false, error: 'No date columns yet.' } : DAILY)
    );
    renderDashboard();
    await logIn();
    await screen.findByRole('heading', { name: 'Attendance — 10/12/2026' });

    await userEvent.click(screen.getByRole('button', { name: 'Weekly' }));

    expect(await screen.findByText('No date columns yet.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Weekly Totals/ })).toBeInTheDocument();
  });

  it('re-fetches the current tab on Refresh', async () => {
    getDirectorView.mockResolvedValue(DAILY);
    renderDashboard();
    await logIn();
    await screen.findByRole('heading', { name: 'Attendance — 10/12/2026' });

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(getDirectorView).toHaveBeenCalledTimes(2);
    expect(getDirectorView).toHaveBeenLastCalledWith('Alex Kim', '1234', 'daily');
  });

  it('returns to the login card on Log out', async () => {
    getDirectorView.mockResolvedValue(DAILY);
    renderDashboard();
    await logIn();
    await screen.findByRole('heading', { name: 'Attendance — 10/12/2026' });

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(screen.getByRole('heading', { name: 'Director View' })).toBeInTheDocument();
    expect(screen.getByLabelText('Personal Code')).toHaveValue('');
  });
});
