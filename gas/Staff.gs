/**
 * ===================================================================
 * ADD STAFF (DIRECTOR)
 * ===================================================================
 * Lets an authorized director add a brand-new person to the attendance
 * roster from the dashboard's Staff tab, filling in every roster
 * column the app reads for them in one go — instead of typing a new
 * row into the sheet by hand. Reuses authorizeDirector
 * (DirectorView.gs).
 */

/**
 * Appends one new roster row. staff is { name, birthday, personalCode,
 * startTime, endTime, maxWeeklyHours, isAdmin }:
 * - name: required, and must not already be on the roster.
 * - birthday: "YYYY-MM-DD" (native date input), optional.
 * - personalCode: optional — left blank, it's generated from the
 *   birthday as MMDDYYYY, the same as the "Generate New Codes" button
 *   (see formatBirthdayAsCode, PersonalCodes.gs). One of the two is
 *   required, since nobody can sign in without a code.
 * - startTime/endTime: "HH:MM" (24-hour), written as the Work Hours
 *   column (see updateWorkHours, WorkHours.gs). Both or neither.
 * - maxWeeklyHours: optional positive number (MAX_WEEKLY_HOURS_HEADER).
 * - isAdmin: true gives them director access ("Yes" in Admin).
 * Any optional column the sheet doesn't have yet is created the first
 * time a value is given for it. Returns { success, message, entry }
 * where entry matches a getWorkHoursView entry, or { success: false,
 * error }.
 */
function addStaffMember(submittedName, submittedPersonalCode, staff) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  staff = staff || {};

  const name = String(staff.name || '').trim().replace(/\s+/g, ' ');

  if (!name) {
    return { success: false, error: 'A name is required.' };
  }

  let birthday = null;

  if (staff.birthday) {
    const birthdayParts = String(staff.birthday).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!birthdayParts) {
      return { success: false, error: 'Birthday is not a valid date.' };
    }

    birthday = new Date(Number(birthdayParts[1]), Number(birthdayParts[2]) - 1, Number(birthdayParts[3]));
  }

  const personalCode = String(staff.personalCode || '').trim() || (birthday ? formatBirthdayAsCode(birthday) : '');

  if (!personalCode) {
    return { success: false, error: 'Enter a personal code or a birthday to generate one from.' };
  }

  const start = parseTimeInputText(staff.startTime);
  const end = parseTimeInputText(staff.endTime);

  if ((staff.startTime || staff.endTime) && (!start || !end)) {
    return { success: false, error: 'Enter both a start time and an end time, or leave both blank.' };
  }

  if (start && end.hour * 60 + end.minute <= start.hour * 60 + start.minute) {
    return { success: false, error: 'End time must be after start time.' };
  }

  let maxWeeklyHours = null;

  if (staff.maxWeeklyHours !== undefined && staff.maxWeeklyHours !== null && String(staff.maxWeeklyHours).trim() !== '') {
    maxWeeklyHours = Number(staff.maxWeeklyHours);

    if (!(maxWeeklyHours > 0)) {
      return { success: false, error: 'Max weekly hours must be a number above 0.' };
    }
  }

  const workHoursText = start ? `${formatTimeOfDay(start)} - ${formatTimeOfDay(end)}` : '';

  // Two directors adding people at the same moment could otherwise both
  // pick the same "next empty row" and overwrite each other.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = auth.sheet;

    // Checked against a fresh read rather than the cached roster, so a
    // name added on the sheet in the last few minutes still counts.
    const roster = buildRosterFromSheet(sheet, getColumnIndexes(sheet));

    if (roster.byLowerName[name.toLowerCase()]) {
      return { success: false, error: `${name} is already on the roster.` };
    }

    const values = {
      Name: name,
      'Personal Code': personalCode,
    };

    if (birthday) {
      values.Birthday = birthday;
    }
    if (workHoursText) {
      values[WORK_HOURS_HEADER] = workHoursText;
    }
    if (maxWeeklyHours !== null) {
      values[MAX_WEEKLY_HOURS_HEADER] = maxWeeklyHours;
    }
    if (staff.isAdmin) {
      values.Admin = 'Yes';
    }

    let columnIndexes = getColumnIndexes(sheet);

    Object.keys(values).forEach((header) => {
      if (columnIndexes[header] === undefined) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        columnIndexes = getColumnIndexes(sheet);
      }
    });

    const rowNumber = sheet.getLastRow() + 1;
    const rowValues = new Array(sheet.getLastColumn()).fill('');

    Object.keys(values).forEach((header) => {
      rowValues[columnIndexes[header]] = values[header];
    });

    // Plain text first, so Sheets doesn't drop a code's leading zero
    // (see runBirthdayCodeGeneration, PersonalCodes.gs) or reinterpret
    // Work Hours as a time.
    sheet.getRange(rowNumber, columnIndexes['Personal Code'] + 1).setNumberFormat('@');

    if (workHoursText) {
      sheet.getRange(rowNumber, columnIndexes[WORK_HOURS_HEADER] + 1).setNumberFormat('@');
    }

    sheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);
    invalidateRosterCache();
  } finally {
    lock.releaseLock();
  }

  return {
    success: true,
    message: `Added ${name}. Their personal code is ${personalCode}.`,
    entry: {
      name: name,
      workHours: workHoursText || null,
      startTime: start ? toTimeInputText(start) : '',
      endTime: end ? toTimeInputText(end) : '',
    },
  };
}
