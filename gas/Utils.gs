/**
 * ===================================================================
 * SHARED UTILITIES
 * ===================================================================
 * Low-level sheet, attendance-cell, and date/time helpers used across
 * every other file in this project.
 */

function getAttendanceSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
}

/**
 * Returns an object containing column indexes. Indexes are zero-based.
 */
function getColumnIndexes(sheet) {
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  const indexes = {};

  headers.forEach((header, index) => {
    const trimmedHeader = String(header).trim();
    if (trimmedHeader !== '') {
      indexes[trimmedHeader] = index;
    }
  });

  return indexes;
}

/**
 * Parses attendance JSON safely.
 */
function parseAttendanceData(existingCellValue, personRowNumber) {
  try {
    return JSON.parse(String(existingCellValue));
  } catch (error) {
    Logger.log(`Could not parse existing attendance data in row ${personRowNumber}.`);
    return null;
  }
}

/**
 * Parses the formatted date string: M/d/yyyy h:mm:ss a
 */
function parseFormattedDateTime(dateTimeText) {
  const dateTimeParts = String(dateTimeText).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i
  );

  if (!dateTimeParts) {
    throw new Error(`Invalid date-time format: ${dateTimeText}`);
  }

  const month = Number(dateTimeParts[1]) - 1;
  const day = Number(dateTimeParts[2]);
  const year = Number(dateTimeParts[3]);
  let hour = Number(dateTimeParts[4]);
  const minute = Number(dateTimeParts[5]);
  const second = Number(dateTimeParts[6]);
  const meridiem = dateTimeParts[7].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) {
    hour += 12;
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Formats a date as: M/d/yyyy h:mm:ss a
 */
function formatDateTime(dateValue) {
  return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'M/d/yyyy h:mm:ss a');
}

/**
 * Returns yesterday's date in the same format used by the headers.
 */
function getPreviousDate(currentDate) {
  const previousDate = new Date(currentDate);
  previousDate.setDate(previousDate.getDate() - 1);
  return Utilities.formatDate(previousDate, Session.getScriptTimeZone(), 'M/d/yyyy');
}

/**
 * Calculates total hours worked between sign-in and sign-out.
 */
function calculateTotalHours(signInDate, signOutDate) {
  const millisecondsWorked = signOutDate.getTime() - signInDate.getTime();
  return formatMinutesWorked(Math.round(millisecondsWorked / (1000 * 60)));
}

/**
 * Formats a whole number of minutes the same way calculateTotalHours
 * does — used directly when summing several sign-in/sign-out sessions
 * on the same day (see buildAttendanceData, AttendanceLogic.gs).
 */
function formatMinutesWorked(totalMinutesWorked) {
  const hoursWorked = Math.floor(totalMinutesWorked / 60);
  const minutesWorked = totalMinutesWorked % 60;

  return {
    formatted: `${hoursWorked} hours and ${minutesWorked} minutes`,
    decimal: Number((totalMinutesWorked / 60).toFixed(2)),
  };
}

/**
 * Parses a plain time-of-day string like "9:00 AM" into { hour,
 * minute } (24-hour). Returns null if it isn't formatted that way —
 * callers treat that the same as "no schedule set".
 */
function parseTimeOfDay(text) {
  const match = String(text)
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) {
    hour += 12;
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return { hour: hour, minute: minute };
}

/**
 * Checks whether a sign-in occurred after its cutoff. Pass a specific
 * person's own { hour, minute } schedule (see SCHEDULED_SIGN_IN_HEADER)
 * to use that instead of the SIGN_IN_CUTOFF_HOUR default — omit it (or
 * pass null) for anyone without one.
 */
function isLateSignIn(signInDate, scheduleOverride) {
  const cutoff = new Date(signInDate);

  if (scheduleOverride) {
    cutoff.setHours(scheduleOverride.hour, scheduleOverride.minute, 0, 0);
  } else {
    cutoff.setHours(SIGN_IN_CUTOFF_HOUR, 0, 0, 0);
  }

  return signInDate > cutoff;
}

/**
 * Returns how long after the cutoff a sign-in occurred, or null if it
 * wasn't late. { hours, minutes, formatted }. Same scheduleOverride as
 * isLateSignIn.
 */
function getLateDuration(signInDate, scheduleOverride) {
  const cutoff = new Date(signInDate);

  if (scheduleOverride) {
    cutoff.setHours(scheduleOverride.hour, scheduleOverride.minute, 0, 0);
  } else {
    cutoff.setHours(SIGN_IN_CUTOFF_HOUR, 0, 0, 0);
  }

  const millisecondsLate = signInDate.getTime() - cutoff.getTime();

  if (millisecondsLate <= 0) {
    return null;
  }

  const totalMinutesLate = Math.round(millisecondsLate / (1000 * 60));
  const hoursLate = Math.floor(totalMinutesLate / 60);
  const minutesLate = totalMinutesLate % 60;

  return {
    hours: hoursLate,
    minutes: minutesLate,
    formatted: formatLateDuration(hoursLate, minutesLate),
  };
}

/**
 * Formats a late duration as "1 hour and 5 minutes", "15 minutes", etc.
 */
function formatLateDuration(hours, minutes) {
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  }

  return parts.join(' and ');
}

/**
 * Creates a date column if it does not already exist.
 */
function createDateColumn(sheet, dateToday) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  const dateAlreadyExists = headers.some((header) => String(header).trim() === dateToday);

  if (dateAlreadyExists) {
    return;
  }

  const newColumnNumber = lastColumn + 1;
  sheet.getRange(1, newColumnNumber).setValue(dateToday);
}

/**
 * Deletes a row from the sheet. Only used by the form-trigger flow.
 */
function deleteSelectedRow(sheet, rowNumber) {
  sheet.deleteRow(rowNumber);
}
