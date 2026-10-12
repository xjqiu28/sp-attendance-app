/**
 * ===================================================================
 * WORK HOURS (DIRECTOR EDITING)
 * ===================================================================
 * Lets an authorized director view and change each person's Work
 * Hours (WORK_HOURS_HEADER) from the dashboard instead of typing into
 * the sheet by hand. That one column drives the late flag, the Work
 * Hours notes, and auto sign-out (see AutoSignOut.gs), so a change
 * here takes effect for all three. Both actions reuse
 * authorizeDirector (DirectorView.gs).
 */

/**
 * Returns every roster name with their current Work Hours: the raw
 * cell text, plus its start/end as "HH:MM" (24-hour, what a native
 * <input type="time"> expects) — blank if the cell is empty or doesn't
 * parse. Read-only; nothing is written.
 */
function getWorkHoursView(submittedName, submittedPersonalCode) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const nameColumnIndex = auth.columnIndexes.Name;
  const workHoursColumnIndex = auth.columnIndexes[WORK_HOURS_HEADER];

  const entries = [];

  auth.dataRows.forEach((row) => {
    const name = String(row[nameColumnIndex]).trim();

    if (!name) {
      return;
    }

    const workHoursText = workHoursColumnIndex !== undefined ? String(row[workHoursColumnIndex]).trim() : '';
    const workHours = parseWorkHours(workHoursText);

    entries.push({
      name: name,
      workHours: workHoursText || null,
      startTime: workHours ? toTimeInputText(workHours.start) : '',
      endTime: workHours ? toTimeInputText(workHours.end) : '',
    });
  });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return { success: true, entries: entries };
}

/**
 * Overwrites one person's Work Hours cell with "<start> - <end>" (e.g.
 * "9:00 AM - 3:00 PM"). startTime/endTime are "HH:MM" (24-hour); both
 * blank clears the cell. Creates the Work Hours column first if the
 * sheet doesn't have one yet.
 */
function updateWorkHours(submittedName, submittedPersonalCode, targetName, startTime, endTime) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!targetName) {
    return { success: false, error: 'A name is required.' };
  }

  const start = parseTimeInputText(startTime);
  const end = parseTimeInputText(endTime);
  const clearing = !startTime && !endTime;

  if (!clearing && (!start || !end)) {
    return { success: false, error: 'Both a start time and an end time are required.' };
  }

  if (!clearing && end.hour * 60 + end.minute <= start.hour * 60 + start.minute) {
    return { success: false, error: 'End time must be after start time.' };
  }

  const sheet = auth.sheet;
  let columnIndexes = auth.columnIndexes;
  let workHoursColumnIndex = columnIndexes[WORK_HOURS_HEADER];

  if (workHoursColumnIndex === undefined) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(WORK_HOURS_HEADER);
    columnIndexes = getColumnIndexes(sheet);
    workHoursColumnIndex = columnIndexes[WORK_HOURS_HEADER];
  }

  const roster = getRoster(sheet, columnIndexes);
  const person = roster.byLowerName[String(targetName).trim().toLowerCase()];

  if (!person) {
    return { success: false, error: 'Name not found. Please check spelling or contact the admin.' };
  }

  const workHoursText = clearing ? '' : `${formatTimeOfDay(start)} - ${formatTimeOfDay(end)}`;

  // Plain text, so Sheets never tries to reinterpret it as a time/date.
  sheet.getRange(person.row, workHoursColumnIndex + 1).setNumberFormat('@').setValue(workHoursText);
  invalidateRosterCache();

  return {
    success: true,
    message: clearing ? `Cleared ${person.name}'s work hours.` : `Updated ${person.name}'s work hours.`,
    workHours: workHoursText || null,
  };
}

/**
 * { hour, minute } -> "HH:MM" (24-hour, zero-padded).
 */
function toTimeInputText(time) {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/**
 * "HH:MM" (24-hour) -> { hour, minute }, or null if blank/invalid.
 */
function parseTimeInputText(text) {
  const match = String(text || '').trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return hour < 24 && minute < 60 ? { hour: hour, minute: minute } : null;
}
