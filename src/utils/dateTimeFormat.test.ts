import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatTimeOnly,
  toBackendDate,
  toBackendDateTime,
  toTimeInputValue,
  todayDateInputValue,
} from './dateTimeFormat.ts';

describe('toBackendDate', () => {
  it('converts a date input value to M/d/yyyy without leading zeros', () => {
    expect(toBackendDate('2026-10-05')).toBe('10/5/2026');
    expect(toBackendDate('2026-01-09')).toBe('1/9/2026');
  });
});

describe('todayDateInputValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's local date as YYYY-MM-DD, zero-padded", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 30));

    expect(todayDateInputValue()).toBe('2026-01-05');
  });
});

describe('toBackendDateTime', () => {
  it('returns an empty string when there is no time', () => {
    expect(toBackendDateTime('2026-10-05', '')).toBe('');
  });

  it('converts 24-hour input to the backend 12-hour format', () => {
    expect(toBackendDateTime('2026-10-05', '09:05')).toBe('10/5/2026 9:05:00 AM');
    expect(toBackendDateTime('2026-10-05', '18:45')).toBe('10/5/2026 6:45:00 PM');
  });

  it('handles midnight and noon', () => {
    expect(toBackendDateTime('2026-10-05', '00:30')).toBe('10/5/2026 12:30:00 AM');
    expect(toBackendDateTime('2026-10-05', '12:00')).toBe('10/5/2026 12:00:00 PM');
  });
});

describe('toTimeInputValue', () => {
  it('returns an empty string for a missing value', () => {
    expect(toTimeInputValue(null)).toBe('');
    expect(toTimeInputValue('')).toBe('');
  });

  it('returns an empty string when no time can be found', () => {
    expect(toTimeInputValue('not a time')).toBe('');
  });

  it('converts the backend 12-hour format to a 24-hour HH:MM value', () => {
    expect(toTimeInputValue('10/5/2026 9:05:00 AM')).toBe('09:05');
    expect(toTimeInputValue('10/5/2026 6:45:00 PM')).toBe('18:45');
  });

  it('handles midnight and noon', () => {
    expect(toTimeInputValue('10/5/2026 12:30:00 AM')).toBe('00:30');
    expect(toTimeInputValue('10/5/2026 12:00:00 PM')).toBe('12:00');
  });

  it('round-trips with toBackendDateTime', () => {
    expect(toTimeInputValue(toBackendDateTime('2026-10-05', '07:15'))).toBe('07:15');
  });
});

describe('formatTimeOnly', () => {
  it('returns null for a missing value', () => {
    expect(formatTimeOnly(null)).toBeNull();
    expect(formatTimeOnly('')).toBeNull();
  });

  it('keeps just the hour, minute and AM/PM', () => {
    expect(formatTimeOnly('10/5/2026 5:38:12 PM')).toBe('5:38 PM');
  });

  it('returns the input unchanged when it is not in the expected format', () => {
    expect(formatTimeOnly('unknown')).toBe('unknown');
  });
});
