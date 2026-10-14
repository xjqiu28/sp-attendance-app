import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEB_APP_URL } from '../config.js';
import {
  addStaff,
  fetchNames,
  getDirectorView,
  submitAttendance,
  updateWorkHours,
} from './attendanceApi.ts';

const fetchMock = vi.fn();

function respondWith(body: unknown) {
  fetchMock.mockResolvedValue({ json: () => Promise.resolve(body) });
}

// The parsed JSON body of the most recent POST.
function lastPostBody() {
  const [, options] = fetchMock.mock.calls.at(-1)!;
  return JSON.parse(options.body);
}

describe('attendanceApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchNames', () => {
    it('GETs the name lists', async () => {
      respondWith({ names: ['Jane Doe', 'John Smith'], directorNames: ['Jane Doe'] });

      expect(await fetchNames()).toEqual({ names: ['Jane Doe', 'John Smith'], directorNames: ['Jane Doe'] });
      expect(fetchMock.mock.calls[0][0]).toBe(`${WEB_APP_URL}?action=getNames`);
    });

    it('falls back to everyone when the backend sends no directorNames', async () => {
      respondWith({ names: ['Jane Doe'] });

      expect(await fetchNames()).toEqual({ names: ['Jane Doe'], directorNames: ['Jane Doe'] });
    });

    it('returns empty lists when the backend sends nothing', async () => {
      respondWith({});

      expect(await fetchNames()).toEqual({ names: [], directorNames: [] });
    });
  });

  describe('POST actions', () => {
    it('sends JSON as text/plain to avoid a CORS preflight', async () => {
      respondWith({ success: true, message: 'Signed in.' });

      await submitAttendance('Jane Doe', '1234', 'in');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(WEB_APP_URL);
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' });
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('returns the backend response as-is', async () => {
      respondWith({ success: false, error: 'Incorrect personal code for that name.' });

      expect(await submitAttendance('Jane Doe', '0000', 'out')).toEqual({
        success: false,
        error: 'Incorrect personal code for that name.',
      });
      expect(lastPostBody()).toEqual({ name: 'Jane Doe', code: '0000', direction: 'out' });
    });

    it('defaults the director view to daily', async () => {
      respondWith({ success: true });

      await getDirectorView('Alex Kim', '1234');

      expect(lastPostBody()).toEqual({ action: 'directorView', name: 'Alex Kim', code: '1234', view: 'daily' });
    });

    it('sends the week number for the weekly view', async () => {
      respondWith({ success: true });

      await getDirectorView('Alex Kim', '1234', 'weekly', 3);

      expect(lastPostBody()).toEqual({ action: 'directorView', name: 'Alex Kim', code: '1234', view: 'weekly', weekNumber: 3 });
    });

    it('sends the target and times when updating work hours', async () => {
      respondWith({ success: true, message: 'Updated.', workHours: '9:00 AM - 3:00 PM' });

      await updateWorkHours('Alex Kim', '1234', 'Jane Doe', '09:00', '15:00');

      expect(lastPostBody()).toEqual({
        action: 'updateWorkHours',
        name: 'Alex Kim',
        code: '1234',
        targetName: 'Jane Doe',
        startTime: '09:00',
        endTime: '15:00',
      });
    });

    it('nests the new person under staff when adding staff', async () => {
      respondWith({ success: true });
      const staff = {
        name: 'John Smith',
        birthday: '',
        personalCode: 'A1',
        startTime: '',
        endTime: '',
        maxWeeklyHours: '',
        isAdmin: false,
      };

      await addStaff('Alex Kim', '1234', staff);

      expect(lastPostBody()).toEqual({ action: 'addStaff', name: 'Alex Kim', code: '1234', staff });
    });

    it('lets a network failure throw', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(submitAttendance('Jane Doe', '1234', 'in')).rejects.toThrow('Failed to fetch');
    });
  });
});
