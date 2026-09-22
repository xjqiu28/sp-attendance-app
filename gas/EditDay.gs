/**
 * ===================================================================
 * EDIT DAY (DIRECTOR MANUAL CORRECTIONS)
 * ===================================================================
 * Lets an authorized director pick any date and fix a person's
 * sign-in/sign-out for it — for when someone forgot to sign in, or
 * forgot to sign out and only came back the day after. Both actions
 * here reuse authorizeDirector (DirectorView.gs), so the same
 * name + personal code + "Admin" column rules apply as every other
 * director-only feature.
 */

/**
 * Returns every roster name's current sign-in/sign-out for one
 * specific date (not just today), so the "Edit Day" screen can show
 * what's already there — including names with nothing recorded yet —
 * before the director corrects it. Read-only; nothing is written.
 */
function getEditDayView(submittedName, submittedPersonalCode, dateString) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!dateString) {
    return { success: false, error: 'A date is required.' };
  }

  const nameColumnIndex = auth.columnIndexes.Name;
  const dateColumnIndex = auth.columnIndexes[dateString];

  const entries = [];

  auth.dataRows.forEach((row) => {
    const name = String(row[nameColumnIndex]).trim();

    if (!name) {
      return;
    }

    let signInTime = null;
    let signOutTime = null;
    let sessions = null;

    if (dateColumnIndex !== undefined) {
      const cellValue = row[dateColumnIndex];

      if (cellValue !== '' && cellValue !== null) {
        const attendanceData = parseAttendanceData(cellValue, null);

        if (attendanceData) {
          signInTime = attendanceData['sign in time'] || null;
          signOutTime = attendanceData['sign out time'] || null;

          // Only set for a day with more than one sign-in/sign-out
          // (someone stepped out and came back) — the two fields above
          // then hold just the first sign-in and last sign-out.
          if (Array.isArray(attendanceData.sessions) && attendanceData.sessions.length > 1) {
            sessions = attendanceData.sessions.map((session) => ({
              signInTime: session['sign in time'] || null,
              signOutTime: session['sign out time'] || null,
            }));
          }
        }
      }
    }

    entries.push({ name: name, signInTime: signInTime, signOutTime: signOutTime, sessions: sessions });
  });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return { success: true, date: dateString, entries: entries };
}

/**
 * Overwrites one person's sign-in/sign-out for one date, replacing
 * any separate sessions that day had with a single one. Both times
 * blank clears the entry; the date column is created first if that
 * date has never had anyone sign in (e.g. a day someone was fully
 * absent and no one else's column exists for it — rare, but possible
 * for a brand-new roster entry).
 */
function updateAttendanceEntry(submittedName, submittedPersonalCode, targetName, dateString, signInTime, signOutTime) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!dateString) {
    return { success: false, error: 'A date is required.' };
  }

  if (!targetName) {
    return { success: false, error: 'A name is required.' };
  }

  if (signOutTime && !signInTime) {
    return { success: false, error: 'A sign-in time is required before a sign-out time can be set.' };
  }

  if (signInTime && signOutTime && parseFormattedDateTime(signOutTime) <= parseFormattedDateTime(signInTime)) {
    return { success: false, error: 'Sign-out time must be after sign-in time.' };
  }

  const sheet = auth.sheet;
  let columnIndexes = auth.columnIndexes;
  let dateColumnIndex = columnIndexes[dateString];

  if (dateColumnIndex === undefined) {
    createDateColumn(sheet, dateString);
    columnIndexes = getColumnIndexes(sheet);
    dateColumnIndex = columnIndexes[dateString];
  }

  const roster = getRoster(sheet, columnIndexes);
  const person = roster.byLowerName[String(targetName).trim().toLowerCase()];

  if (!person) {
    return { success: false, error: 'Name not found. Please check spelling or contact the admin.' };
  }

  const attendanceCell = sheet.getRange(person.row, dateColumnIndex + 1);
  writeAttendanceCell(attendanceCell, signInTime, signOutTime, person.signInSchedule);

  return { success: true, message: `Updated ${person.name}'s entry for ${dateString}.` };
}
