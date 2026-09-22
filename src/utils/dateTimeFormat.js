// Conversions between native <input type="date"/"time"> values and the
// "M/d/yyyy h:mm:ss a" strings the backend stores sign-in/out times as
// (see formatDateTime/parseFormattedDateTime in gas/Utils.gs). Used by
// the director's "Edit Day" correction tool.

// "YYYY-MM-DD" (native date input) -> "M/d/yyyy" (backend date-column
// header format, no leading zeros).
export function toBackendDate(dateInputValue) {
  const [year, month, day] = dateInputValue.split('-').map(Number);
  return `${month}/${day}/${year}`;
}

// Today's date as a native <input type="date"> value, in the browser's
// local timezone — Date#toISOString() is UTC and can be off by a day.
export function todayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// "YYYY-MM-DD" + "HH:MM" (native date/time inputs) -> the full
// "M/d/yyyy h:mm:ss a" string the backend expects. Returns '' when
// there's no time (clearing a sign-in/sign-out).
export function toBackendDateTime(dateInputValue, timeInputValue) {
  if (!timeInputValue) {
    return '';
  }

  const backendDate = toBackendDate(dateInputValue);
  let [hour, minute] = timeInputValue.split(':').map(Number);
  const meridiem = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12 || 12;

  return `${backendDate} ${hour}:${String(minute).padStart(2, '0')}:00 ${meridiem}`;
}

// The backend's full "M/d/yyyy h:mm:ss a" string -> a native
// <input type="time"> value ("HH:MM", 24-hour). Returns '' if there's
// nothing to show.
export function toTimeInputValue(fullDateTimeString) {
  if (!fullDateTimeString) {
    return '';
  }

  const match = fullDateTimeString.match(/(\d{1,2}):(\d{2}):\d{2}\s+(AM|PM)/i);

  if (!match) {
    return '';
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) {
    hour += 12;
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

// Backend stores times as "M/d/yyyy h:mm:ss a" — pull out just the
// "h:mm a" part for a cleaner display (e.g. "5:38 PM").
export function formatTimeOnly(dateTimeString) {
  if (!dateTimeString) {
    return null;
  }

  const parts = dateTimeString.split(' ');

  if (parts.length < 3) {
    return dateTimeString;
  }

  const [hour, minute] = parts[1].split(':');
  return `${hour}:${minute} ${parts[2]}`;
}
