/**
 * ===================================================================
 * SIGN-IN / SIGN-OUT LOGIC
 * ===================================================================
 * Everything involved in recording an attendance submission, shared
 * by both myFunction (the legacy Google Form trigger, in Code.gs) and
 * processAttendanceSubmission (the web app entry point).
 */

/**
 * Same matching + attendance logic as myFunction, minus the
 * "temporary form row" handling — nothing is written unless the
 * code is verified.
 *
 * direction is 'in' or 'out' — which button the person pressed (see
 * recordDirectedAttendanceEntry). Anything else (an older cached copy
 * of the site that only had one button) falls back to alternating
 * sign-in/sign-out, like the legacy Google Form flow.
 */
function processAttendanceSubmission(submittedName, submittedPersonalCode, direction) {
  const sheet = getAttendanceSheet();

  let columnIndexes = getColumnIndexes(sheet);

  const nameColumnIndex = columnIndexes.Name;
  const personalCodeColumnIndex = columnIndexes['Personal Code'];

  if (nameColumnIndex === undefined || personalCodeColumnIndex === undefined) {
    throw new Error('The sheet must contain both "Name" and "Personal Code" headers.');
  }

  const currentTime = new Date();
  const dateToday = Utilities.formatDate(currentTime, Session.getScriptTimeZone(), 'M/d/yyyy');

  let todayColumnIndex = columnIndexes[dateToday];

  if (todayColumnIndex === undefined) {
    createDateColumn(sheet, dateToday);
    columnIndexes = getColumnIndexes(sheet);
    todayColumnIndex = columnIndexes[dateToday];
  }

  // Cached name -> row/code lookup instead of bulk-reading every row AND
  // every date column ever created — a name/code mismatch now costs zero
  // sheet reads, and a match only reads the two cells it actually needs.
  const roster = getRoster(sheet, columnIndexes);
  const person = roster.byLowerName[submittedName.toLowerCase()];

  if (!person) {
    return { success: false, error: 'Name not found. Please check spelling or contact the admin.' };
  }

  if (person.personalCode !== submittedPersonalCode) {
    return { success: false, error: 'Incorrect personal code for that name.' };
  }

  const personRowNumber = person.row;

  if (direction === 'in' || direction === 'out') {
    return processDirectedSubmission(sheet, columnIndexes, person, todayColumnIndex, currentTime, direction);
  }

  const yesterdayDate = getPreviousDate(currentTime);
  const yesterdayColumnIndex = columnIndexes[yesterdayDate];

  if (yesterdayColumnIndex !== undefined) {
    const yesterdayAttendanceCell = sheet.getRange(personRowNumber, yesterdayColumnIndex + 1);
    const yesterdayCellValue = yesterdayAttendanceCell.getValue();

    if (yesterdayCellValue !== '' && yesterdayCellValue !== null) {
      const yesterdayAttendanceData = parseAttendanceData(yesterdayCellValue, personRowNumber);

      if (
        yesterdayAttendanceData &&
        yesterdayAttendanceData['sign in time'] &&
        !yesterdayAttendanceData['sign out time']
      ) {
        recordPreviousDaySignOut(
          personRowNumber,
          yesterdayAttendanceCell,
          yesterdayAttendanceData,
          currentTime,
          person.signInSchedule
        );

        return {
          success: true,
          message: `${person.name}, you were signed out for yesterday (${yesterdayDate}).`,
        };
      }
    }
  }

  const attendanceCell = sheet.getRange(personRowNumber, todayColumnIndex + 1);
  const entryStatus = recordAttendanceEntry(personRowNumber, attendanceCell, person.signInSchedule);

  if (entryStatus === 'signed-in') {
    return { success: true, message: `${person.name}, you have been signed in.` };
  }
  if (entryStatus === 'signed-in-again') {
    return { success: true, message: `${person.name}, welcome back — you have been signed in again.` };
  }
  if (entryStatus === 'signed-out') {
    return { success: true, message: `${person.name}, you have been signed out.` };
  }
  return { success: false, error: `${person.name}, today's attendance entry couldn't be read. Please contact the admin.` };
}

/**
 * Handles a press of the explicit Sign In or Sign Out button. Unlike
 * the alternating flow, a press that doesn't match the person's
 * current state is rejected instead of recorded — so someone who
 * forgot to sign out when stepping out can't have their "I'm back"
 * press silently recorded as a sign-out (which would count the time
 * away as worked).
 *
 * Sign Out with nothing yet today but an open sign-in from yesterday
 * signs out of yesterday, same as the alternating flow. Sign In with
 * an open sign-in from yesterday just signs in for today and tells
 * the person to have a director fix yesterday.
 */
function processDirectedSubmission(sheet, columnIndexes, person, todayColumnIndex, currentTime, direction) {
  const attendanceCell = sheet.getRange(person.row, todayColumnIndex + 1);
  const cellValue = attendanceCell.getValue();
  let sessions = null;

  if (cellValue !== '' && cellValue !== null) {
    const attendanceData = parseAttendanceData(cellValue, person.row);

    if (!attendanceData || !attendanceData['sign in time']) {
      return {
        success: false,
        error: `${person.name}, today's attendance entry couldn't be read. Please contact the admin.`,
      };
    }

    sessions = getAttendanceSessions(attendanceData);
  }

  const lastSession = sessions ? sessions[sessions.length - 1] : null;
  const isSignedIn = Boolean(lastSession && !lastSession['sign out time']);

  const yesterdayDate = getPreviousDate(currentTime);
  const yesterdayColumnIndex = columnIndexes[yesterdayDate];
  let yesterdayCell = null;
  let yesterdayData = null;

  if (!sessions && yesterdayColumnIndex !== undefined) {
    yesterdayCell = sheet.getRange(person.row, yesterdayColumnIndex + 1);
    const yesterdayValue = yesterdayCell.getValue();

    if (yesterdayValue !== '' && yesterdayValue !== null) {
      const parsed = parseAttendanceData(yesterdayValue, person.row);

      if (parsed && parsed['sign in time'] && !parsed['sign out time']) {
        yesterdayData = parsed;
      }
    }
  }

  if (direction === 'in') {
    if (isSignedIn) {
      return {
        success: false,
        error: `${person.name}, you're already signed in (since ${formatTimeOfDayText(
          lastSession['sign in time']
        )}). Press Sign Out when you leave.`,
      };
    }

    const signInTime = formatDateTime(currentTime);

    if (sessions) {
      sessions.push({ 'sign in time': signInTime });
    } else {
      sessions = [{ 'sign in time': signInTime }];
    }

    writeAttendanceSessions(attendanceCell, sessions, person.signInSchedule);

    let message =
      sessions.length > 1
        ? `${person.name}, welcome back — you have been signed in again.`
        : `${person.name}, you have been signed in.`;

    if (yesterdayData) {
      message += ` Note: you never signed out on ${yesterdayDate} — please let a director know.`;
    }

    return { success: true, message: message };
  }

  if (isSignedIn) {
    lastSession['sign out time'] = formatDateTime(currentTime);
    writeAttendanceSessions(attendanceCell, sessions, person.signInSchedule);
    return { success: true, message: `${person.name}, you have been signed out.` };
  }

  if (yesterdayData) {
    recordPreviousDaySignOut(person.row, yesterdayCell, yesterdayData, currentTime, person.signInSchedule);
    return {
      success: true,
      message: `${person.name}, you were signed out for yesterday (${yesterdayDate}).`,
    };
  }

  if (!lastSession) {
    return { success: false, error: `${person.name}, you haven't signed in today. Press Sign In first.` };
  }

  return {
    success: false,
    error: `${person.name}, you already signed out at ${formatTimeOfDayText(
      lastSession['sign out time']
    )}. If you came back, press Sign In.`,
  };
}

/**
 * "M/d/yyyy h:mm:ss a" -> just "h:mm AM/PM", for messages.
 */
function formatTimeOfDayText(dateTimeText) {
  return Utilities.formatDate(parseFormattedDateTime(dateTimeText), Session.getScriptTimeZone(), 'h:mm a');
}

/**
 * Records either sign-in or sign-out for today's attendance cell.
 * Returns 'signed-in' | 'signed-out' | 'signed-in-again' |
 * 'already-complete' (the last only if the cell can't be parsed).
 *
 * signInSchedule is the person's own { hour, minute } start time (see
 * getSignInSchedule, Utils.gs), or null to use SIGN_IN_CUTOFF_HOUR.
 *
 * Submissions alternate sign-in / sign-out, so someone who steps out
 * mid-day and comes back (e.g. in 8:30am, out 11am, back 2pm, out
 * 3:30pm) gets one session per stretch, and only the time actually
 * signed in counts toward total hours — see buildAttendanceData.
 *
 * First entry:
 * - Saves sign-in time.
 * - If after the cutoff, colors only the sign-in label and time red.
 *
 * Every entry after that:
 * - Signs out of the open session, or starts a new one if the last
 *   session is already signed out.
 * - Recalculates formatted and decimal total hours across all
 *   completed sessions.
 */
function recordAttendanceEntry(personRowNumber, attendanceCell, signInSchedule) {
  const currentTime = new Date();
  const existingCellValue = attendanceCell.getValue();

  if (existingCellValue === '' || existingCellValue === null) {
    const signInTime = formatDateTime(currentTime);

    const attendanceData = {
      'sign in time': signInTime,
    };

    const signInJsonText = JSON.stringify(attendanceData);

    attendanceCell.setValue(signInJsonText);

    if (isLateSignIn(currentTime, signInSchedule)) {
      applyLateSignInFormatting(attendanceCell, signInJsonText, signInTime);
    }

    return 'signed-in';
  }

  const attendanceData = parseAttendanceData(existingCellValue, personRowNumber);

  if (!attendanceData || !attendanceData['sign in time']) {
    return 'already-complete';
  }

  const sessions = getAttendanceSessions(attendanceData);
  const lastSession = sessions[sessions.length - 1];

  if (lastSession['sign out time']) {
    sessions.push({ 'sign in time': formatDateTime(currentTime) });
    writeAttendanceSessions(attendanceCell, sessions, signInSchedule);
    return 'signed-in-again';
  }

  lastSession['sign out time'] = formatDateTime(currentTime);
  writeAttendanceSessions(attendanceCell, sessions, signInSchedule);

  return 'signed-out';
}

/**
 * Records today's submission as the previous day's sign-out.
 */
function recordPreviousDaySignOut(personRowNumber, attendanceCell, attendanceData, currentTime, signInSchedule) {
  recordSignOutForAttendanceCell(personRowNumber, attendanceCell, attendanceData, currentTime, signInSchedule);
}

/**
 * Signs out of the open (last) session in an attendance cell that
 * already contains a sign-in.
 */
function recordSignOutForAttendanceCell(
  personRowNumber,
  attendanceCell,
  attendanceData,
  currentTime,
  signInSchedule
) {
  const sessions = getAttendanceSessions(attendanceData);
  sessions[sessions.length - 1]['sign out time'] = formatDateTime(currentTime);
  writeAttendanceSessions(attendanceCell, sessions, signInSchedule);
}

/**
 * Returns a day's sign-in/sign-out sessions, oldest first. A day with
 * a single session (the usual case) has no "sessions" key stored at
 * all, so it's rebuilt here from the top-level times.
 */
function getAttendanceSessions(attendanceData) {
  if (Array.isArray(attendanceData.sessions) && attendanceData.sessions.length > 0) {
    return attendanceData.sessions.map((session) => Object.assign({}, session));
  }

  const session = { 'sign in time': attendanceData['sign in time'] };

  if (attendanceData['sign out time']) {
    session['sign out time'] = attendanceData['sign out time'];
  }

  return [session];
}

/**
 * Builds the stored cell object from a day's sessions:
 * - "sign in time" is the day's first sign-in (what lateness is
 *   judged by), "sign out time" the last sign-out — left off while
 *   the person is currently signed back in, so every "signed in but
 *   not out yet" check (auto sign-out, yesterday's sign-out, the
 *   dashboard's status) keeps working unchanged.
 * - Total hours add up only the completed sessions, so time spent
 *   stepped out in between is never counted.
 * - "sessions" is only stored when there's more than one, so a
 *   normal single sign-in/sign-out day looks exactly as it always has.
 */
function buildAttendanceData(sessions) {
  const attendanceData = {};
  let totalMinutesWorked = 0;
  let hasCompletedSession = false;

  sessions.forEach((session) => {
    if (session['sign out time']) {
      const millisecondsWorked =
        parseFormattedDateTime(session['sign out time']).getTime() -
        parseFormattedDateTime(session['sign in time']).getTime();
      totalMinutesWorked += Math.round(millisecondsWorked / (1000 * 60));
      hasCompletedSession = true;
    }
  });

  if (hasCompletedSession) {
    const totalHoursWorked = formatMinutesWorked(totalMinutesWorked);
    attendanceData['total hour worked'] = totalHoursWorked.formatted;
    attendanceData['total hour worked decimal'] = totalHoursWorked.decimal;
  }

  attendanceData['sign in time'] = sessions[0]['sign in time'];

  const lastSession = sessions[sessions.length - 1];

  if (lastSession['sign out time']) {
    attendanceData['sign out time'] = lastSession['sign out time'];
  }

  if (sessions.length > 1) {
    attendanceData.sessions = sessions;
  }

  return attendanceData;
}

/**
 * Writes a day's sessions to its cell, reapplying late formatting
 * based on the day's first sign-in.
 */
function writeAttendanceSessions(attendanceCell, sessions, signInSchedule) {
  const attendanceData = buildAttendanceData(sessions);
  const jsonText = JSON.stringify(attendanceData);
  const firstSignInTime = attendanceData['sign in time'];

  if (isLateSignIn(parseFormattedDateTime(firstSignInTime), signInSchedule)) {
    applyLateSignInFormatting(attendanceCell, jsonText, firstSignInTime);
  } else {
    attendanceCell.setValue(jsonText);
  }
}

/**
 * Applies red font only to the "sign in time" label and its time.
 */
function applyLateSignInFormatting(attendanceCell, jsonText, signInTime) {
  const signInText = `"sign in time":"${signInTime}"`;
  const startIndex = jsonText.indexOf(signInText);

  if (startIndex === -1) {
    attendanceCell.setValue(jsonText);
    return;
  }

  const richTextBuilder = SpreadsheetApp.newRichTextValue().setText(jsonText);
  const redTextStyle = SpreadsheetApp.newTextStyle().setForegroundColor('red').build();

  richTextBuilder.setTextStyle(startIndex, startIndex + signInText.length, redTextStyle);
  attendanceCell.setRichTextValue(richTextBuilder.build());
}

/**
 * Writes an attendance cell directly from an explicit sign-in/sign-out
 * pair, instead of deriving them from "now" like recordAttendanceEntry
 * does. Used by the director's manual "Edit Day" correction tool, where
 * both times (or the clearing of both) are supplied by the director
 * rather than detected from a live submission.
 *
 * - Both blank: clears the cell entirely.
 * - Sign-in only: same shape as a normal not-yet-signed-out entry.
 * - Both present: total hours are recalculated, matching a normal
 *   completed day.
 * Late formatting is reapplied/removed based on the (possibly edited)
 * sign-in time, exactly as a live submission would. signInSchedule is
 * the person's own { hour, minute } start time (getSignInSchedule,
 * Utils.gs), or null/omitted to use SIGN_IN_CUTOFF_HOUR.
 */
function writeAttendanceCell(attendanceCell, signInTime, signOutTime, signInSchedule) {
  if (!signInTime && !signOutTime) {
    attendanceCell.setValue('');
    return;
  }

  let attendanceData;

  if (signInTime && signOutTime) {
    const signInDate = parseFormattedDateTime(signInTime);
    const signOutDate = parseFormattedDateTime(signOutTime);
    const totalHoursWorked = calculateTotalHours(signInDate, signOutDate);

    attendanceData = {
      'total hour worked': totalHoursWorked.formatted,
      'total hour worked decimal': totalHoursWorked.decimal,
      'sign in time': signInTime,
      'sign out time': signOutTime,
    };
  } else {
    attendanceData = { 'sign in time': signInTime };
  }

  const jsonText = JSON.stringify(attendanceData);

  if (isLateSignIn(parseFormattedDateTime(signInTime), signInSchedule)) {
    applyLateSignInFormatting(attendanceCell, jsonText, signInTime);
  } else {
    attendanceCell.setValue(jsonText);
  }
}

/**
 * Returns every non-blank name from the Name column, alphabetized,
 * for populating the website's dropdown. Personal codes are never
 * included in this response.
 */
function getNamesList() {
  const sheet = getAttendanceSheet();
  const columnIndexes = getColumnIndexes(sheet);

  if (columnIndexes.Name === undefined) {
    return [];
  }

  const roster = getRoster(sheet, columnIndexes);

  const names = Object.keys(roster.byLowerName).map((key) => roster.byLowerName[key].name);
  names.sort((a, b) => a.localeCompare(b));

  return names;
}
