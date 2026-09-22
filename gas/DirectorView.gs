/**
 * ===================================================================
 * DIRECTOR DASHBOARD
 * ===================================================================
 * Read-only views for the director dashboard: today's attendance
 * (with total signed-in, absent, and late-sign-in lists) and a
 * Monday-Saturday weekly totals view the director can page through
 * week by week.
 *
 * SETUP REQUIRED: add a column header "Admin" to the sheet, and put
 * "Yes" in that column for whichever row(s) should have director
 * access. Everyone else — even with a correct name + code — gets
 * "not authorized" instead of the dashboard.
 */

/**
 * Validates name + personal code AND checks the "Admin" column.
 * Shared by every director-only action (the dashboard views here, and
 * birthday code generation in PersonalCodes.gs) so the authorization
 * rules only live in one place.
 *
 * Returns { authorized: true, sheet, columnIndexes, dataRows } or
 * { authorized: false, error }.
 */
function authorizeDirector(submittedName, submittedPersonalCode) {
  const sheet = getAttendanceSheet();
  const columnIndexes = getColumnIndexes(sheet);

  const nameColumnIndex = columnIndexes.Name;
  const personalCodeColumnIndex = columnIndexes['Personal Code'];

  if (nameColumnIndex === undefined || personalCodeColumnIndex === undefined) {
    throw new Error('The sheet must contain both "Name" and "Personal Code" headers.');
  }

  // Cached roster lookup instead of a full-sheet bulk read — a bad name
  // or code (by far the most common case for typos) now fails without
  // touching the sheet at all.
  const roster = getRoster(sheet, columnIndexes);
  const person = roster.byLowerName[submittedName.toLowerCase()];

  if (!person) {
    return { authorized: false, error: 'Name not found. Please check spelling or contact the admin.' };
  }

  if (person.personalCode !== submittedPersonalCode) {
    return { authorized: false, error: 'Incorrect personal code for that name.' };
  }

  if (columnIndexes.Admin === undefined) {
    return {
      authorized: false,
      error: 'This view has not been set up yet. Add an "Admin" column to the sheet and mark this person Yes.',
    };
  }

  if (!person.isAdmin) {
    return { authorized: false, error: 'This account is not authorized to view this page.' };
  }

  // Only an authorized request pays for the full-sheet read — the
  // dashboard views need every date column, which changes on every
  // sign-in/out and so can't be served from the roster cache.
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const dataRows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  return { authorized: true, sheet: sheet, columnIndexes: columnIndexes, dataRows: dataRows };
}

/**
 * Authorizes the director, then returns TODAY's attendance (daily) or
 * a Monday-Saturday weekly totals view (weekly). Read-only; nothing
 * is written.
 */
function getDirectorAttendanceView(submittedName, submittedPersonalCode, requestedView, weekNumber) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  return requestedView === 'weekly'
    ? buildDirectorWeeklyResult(auth.columnIndexes, auth.dataRows, weekNumber)
    : buildDirectorAttendanceResult(auth.columnIndexes, auth.dataRows);
}

/**
 * Builds today's attendance list for every person on the roster, plus
 * summary counts/lists: how many have signed in, who hasn't signed in
 * at all (absent so far), and who signed in late.
 */
function buildDirectorAttendanceResult(columnIndexes, dataRows) {
  const nameColumnIndex = columnIndexes.Name;
  const scheduledSignInColumnIndex = columnIndexes[SCHEDULED_SIGN_IN_HEADER];
  const workHoursColumnIndex = columnIndexes[WORK_HOURS_HEADER];
  const dateToday = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'M/d/yyyy');
  const todayColumnIndex = columnIndexes[dateToday];

  const entries = [];

  dataRows.forEach((row) => {
    const name = String(row[nameColumnIndex]).trim();

    if (!name) {
      return;
    }

    let signInTime = null;
    let signOutTime = null;
    let totalHoursDecimal = null;
    let totalHoursFormatted = null;
    let isLate = false;
    let lateBy = null;

    const workHoursText = workHoursColumnIndex !== undefined ? String(row[workHoursColumnIndex]).trim() : '';

    if (todayColumnIndex !== undefined) {
      const cellValue = row[todayColumnIndex];

      if (cellValue !== '' && cellValue !== null) {
        const attendanceData = parseAttendanceData(cellValue, null);

        if (attendanceData) {
          signInTime = attendanceData['sign in time'] || null;
          signOutTime = attendanceData['sign out time'] || null;

          if (typeof attendanceData['total hour worked decimal'] === 'number') {
            totalHoursDecimal = attendanceData['total hour worked decimal'];
            totalHoursFormatted = attendanceData['total hour worked'];
          }

          if (signInTime) {
            const signInSchedule = getSignInSchedule(
              workHoursText,
              scheduledSignInColumnIndex !== undefined ? row[scheduledSignInColumnIndex] : ''
            );
            const parsedSignInTime = parseFormattedDateTime(signInTime);
            isLate = isLateSignIn(parsedSignInTime, signInSchedule);
            lateBy = isLate ? getLateDuration(parsedSignInTime, signInSchedule) : null;
          }
        }
      }
    }

    let status;

    if (signInTime && signOutTime) {
      status = 'Complete';
    } else if (signInTime) {
      status = 'Signed In';
    } else {
      status = 'Not Signed In';
    }

    entries.push({
      name: name,
      signInTime: signInTime,
      signOutTime: signOutTime,
      totalHoursDecimal: totalHoursDecimal,
      totalHoursFormatted: totalHoursFormatted,
      status: status,
      isLate: isLate,
      lateBy: lateBy,
      workHours: workHoursText || null,
      workHoursNotes: getWorkHoursNotes(signInTime, signOutTime, parseWorkHours(workHoursText)),
    });
  });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const totalSignedIn = entries.filter((entry) => Boolean(entry.signInTime)).length;
  const absentNames = entries.filter((entry) => !entry.signInTime).map((entry) => entry.name);
  const lateNames = entries
    .filter((entry) => entry.isLate)
    .map((entry) => ({ name: entry.name, lateBy: entry.lateBy ? entry.lateBy.formatted : null }));

  return {
    success: true,
    date: dateToday,
    entries: entries,
    totalRoster: entries.length,
    totalSignedIn: totalSignedIn,
    absentNames: absentNames,
    lateNames: lateNames,
  };
}

/**
 * True for a header like "9/14/2026".
 */
function isDateHeaderKey(headerKey) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(headerKey);
}

function parseHeaderDate(dateString) {
  const parts = dateString.split('/');
  return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
}

/**
 * Rolls a date back to the Monday of its calendar week.
 */
function mondayOnOrBefore(date) {
  const result = new Date(date);
  const dayOfWeek = result.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildWeekMeta(weekNumber, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5); // Monday -> Saturday

  const timeZone = Session.getScriptTimeZone();
  const startLabel = Utilities.formatDate(weekStart, timeZone, 'M/d');
  const endLabel = Utilities.formatDate(weekEnd, timeZone, 'M/d');

  return {
    weekNumber: weekNumber,
    weekStart: Utilities.formatDate(weekStart, timeZone, 'M/d/yyyy'),
    weekEnd: Utilities.formatDate(weekEnd, timeZone, 'M/d/yyyy'),
    label: `Week ${weekNumber} (${startLabel} - ${endLabel})`,
  };
}

/**
 * Splits every date column found in the sheet into successive
 * Monday-Saturday blocks (Week 1, Week 2, ...), anchored to the
 * Monday on/before the earliest date column. Powers the week-picker
 * buttons on the director dashboard.
 */
function getAvailableWeeks(columnIndexes) {
  const dates = Object.keys(columnIndexes)
    .filter(isDateHeaderKey)
    .map(parseHeaderDate)
    .sort((a, b) => a - b);

  if (dates.length === 0) {
    return [buildWeekMeta(1, mondayOnOrBefore(new Date()))];
  }

  const firstMonday = mondayOnOrBefore(dates[0]);
  const lastDate = dates[dates.length - 1];

  const weeks = [];
  const cursor = new Date(firstMonday);
  let weekNumber = 1;

  while (cursor <= lastDate) {
    weeks.push(buildWeekMeta(weekNumber, cursor));
    cursor.setDate(cursor.getDate() + 7);
    weekNumber++;
  }

  return weeks;
}

/**
 * Builds each person's totals for one Monday-Saturday week, along
 * with the full list of available weeks so the dashboard can render
 * "Week 1 (9/14-9/19)"-style picker buttons. Defaults to the most
 * recent available week when weekNumber isn't given or doesn't match
 * one of the available weeks.
 */
function buildDirectorWeeklyResult(columnIndexes, dataRows, weekNumber) {
  const nameColumnIndex = columnIndexes.Name;
  const maxWeeklyHoursColumnIndex = columnIndexes[MAX_WEEKLY_HOURS_HEADER];
  const workHoursColumnIndex = columnIndexes[WORK_HOURS_HEADER];
  const availableWeeks = getAvailableWeeks(columnIndexes);
  const approvals = getWeekApprovals();

  const selectedWeek =
    availableWeeks.find((week) => week.weekNumber === Number(weekNumber)) ||
    availableWeeks[availableWeeks.length - 1];

  const timeZone = Session.getScriptTimeZone();
  const weekStartDate = parseHeaderDate(selectedWeek.weekStart);
  const weekEndDate = parseHeaderDate(selectedWeek.weekEnd);

  const weekDates = [];
  const cursor = new Date(weekStartDate);

  while (cursor <= weekEndDate) {
    weekDates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const entries = [];

  dataRows.forEach((row) => {
    const name = String(row[nameColumnIndex]).trim();

    if (!name) {
      return;
    }

    let weekTotalHours = 0;

    const workHoursText = workHoursColumnIndex !== undefined ? String(row[workHoursColumnIndex]).trim() : '';
    const workHours = parseWorkHours(workHoursText);

    const days = weekDates.map((date) => {
      const dateString = Utilities.formatDate(date, timeZone, 'M/d/yyyy');
      const dateColumnIndex = columnIndexes[dateString];

      let signInTime = null;
      let signOutTime = null;
      let hoursFormatted = null;

      if (dateColumnIndex !== undefined) {
        const cellValue = row[dateColumnIndex];

        if (cellValue !== '' && cellValue !== null) {
          const attendanceData = parseAttendanceData(cellValue, null);

          if (attendanceData) {
            signInTime = attendanceData['sign in time'] || null;
            signOutTime = attendanceData['sign out time'] || null;
            hoursFormatted = attendanceData['total hour worked'] || null;

            if (typeof attendanceData['total hour worked decimal'] === 'number') {
              weekTotalHours += attendanceData['total hour worked decimal'];
            }
          }
        }
      }

      return {
        label: Utilities.formatDate(date, timeZone, 'EEEE'),
        date: dateString,
        signInTime: signInTime,
        signOutTime: signOutTime,
        hoursFormatted: hoursFormatted,
        workHoursNotes: getWorkHoursNotes(signInTime, signOutTime, workHours),
      };
    });

    const roundedTotal = Number(weekTotalHours.toFixed(2));
    const wholeHours = Math.floor(roundedTotal);
    const remainderMinutes = Math.round((roundedTotal - wholeHours) * 60);

    const maxWeeklyHoursValue =
      maxWeeklyHoursColumnIndex !== undefined ? row[maxWeeklyHoursColumnIndex] : '';
    const maxWeeklyHours =
      maxWeeklyHoursValue !== '' && maxWeeklyHoursValue !== null ? Number(maxWeeklyHoursValue) : null;
    const overCap = maxWeeklyHours !== null && roundedTotal > maxWeeklyHours;
    const approval = approvals[`${name.toLowerCase()}|${selectedWeek.weekStart}`] || null;

    entries.push({
      name: name,
      weekTotalHours: roundedTotal,
      weekTotalFormatted: `${wholeHours} hours and ${remainderMinutes} minutes`,
      workHours: workHoursText || null,
      days: days,
      maxWeeklyHours: maxWeeklyHours,
      overCap: overCap,
      approval: approval,
    });
  });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    success: true,
    weekNumber: selectedWeek.weekNumber,
    weekStart: selectedWeek.weekStart,
    weekEnd: selectedWeek.weekEnd,
    availableWeeks: availableWeeks,
    entries: entries,
  };
}
