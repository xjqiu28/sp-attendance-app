/**
 * ===================================================================
 * WEEKLY TOTALS REPORT (Friday auto-report)
 * ===================================================================
 * Sums each person's daily "total hour worked decimal" across a
 * Monday-Friday work week and writes the results to a tab named for
 * that specific week (e.g. "Week of 9-7-2026 to 9-11-2026"), with
 * one row per person: Name | Monday | Tuesday | Wednesday | Thursday
 * | Friday | Total for Week. A new tab is created for each new work
 * week; re-running the report mid-week updates existing rows in that
 * week's tab rather than duplicating them.
 *
 * This is separate from the director dashboard's interactive weekly
 * view (see DirectorView.gs), which covers Monday-Saturday and lets
 * the director pick any past week — including its own over-cap
 * flagging and approval workflow (WeekApprovals.gs). This report
 * computes its own Monday-Friday total per person and flags anyone
 * over their MAX_WEEKLY_HOURS_HEADER cap (Config.gs) independently,
 * since the two totals can differ when someone works a Saturday.
 *
 * Also emails the report to TIMESHEET_REPORT_EMAIL (Config.gs) — set
 * it to '' to only write the report tab without emailing anyone.
 *
 * ONE-TIME SETUP: run createWeeklyTotalsTrigger() once (select it in
 * the function dropdown at the top of the Apps Script editor, click
 * Run, and approve the permissions prompt — sending mail needs a
 * scope the earlier setup didn't). That installs a trigger that runs
 * generateWeeklyTotalsReport() automatically every Friday night,
 * summarizing that same Monday through Friday.
 *
 * You can also run generateWeeklyTotalsReport() manually any time to
 * generate the report for the current/most recent work week on demand,
 * or use the director dashboard's Generate Report button (Weekly tab),
 * which does the same for whichever week is selected there and emails
 * it to whatever address the director types in — see
 * generateReportForWeek below.
 */

function generateWeeklyTotalsReport() {
  const weekRange = getMostRecentCompletedWeek(new Date());
  const results = buildWeeklyTotalsResults(getAttendanceSheet(), weekRange);

  const reportSheet = writeWeeklyTotalsReport(weekRange, results);
  emailWeeklyTimesheet(weekRange, results, TIMESHEET_REPORT_EMAIL, getReportSheetUrl(reportSheet));

  return results;
}

/**
 * Director-triggered version of generateWeeklyTotalsReport: writes the
 * report tab for the Monday-Friday work week starting on weekStart
 * ("M/d/yyyy", a Monday — the dashboard's selected week), then emails
 * it to email if one was given. Blank email just writes the tab.
 */
function generateReportForWeek(submittedName, submittedPersonalCode, weekStart, email) {
  const auth = authorizeDirector(submittedName, submittedPersonalCode);

  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!weekStart) {
    return { success: false, error: 'A week is required.' };
  }

  const recipient = String(email || '').trim();

  if (recipient && !isValidEmail(recipient)) {
    return { success: false, error: `"${recipient}" doesn't look like an email address.` };
  }

  const start = parseHeaderDate(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Friday of that same work week

  const weekRange = { weekStart: start, weekEnd: end };
  const results = buildWeeklyTotalsResults(auth.sheet, weekRange);
  const reportSheet = writeWeeklyTotalsReport(weekRange, results);
  const reportUrl = getReportSheetUrl(reportSheet);

  if (recipient) {
    emailWeeklyTimesheet(weekRange, results, recipient, reportUrl);
  }

  const tabName = reportSheet.getName();

  return {
    success: true,
    message: recipient
      ? `Report saved to the "${tabName}" tab and emailed to ${recipient}.`
      : `Report saved to the "${tabName}" tab.`,
    tabName: tabName,
    reportUrl: reportUrl,
  };
}

/**
 * Direct link to one tab of the attendance spreadsheet.
 */
function getReportSheetUrl(reportSheet) {
  return `${SpreadsheetApp.getActiveSpreadsheet().getUrl()}#gid=${reportSheet.getSheetId()}`;
}

/**
 * Each roster person's hours for every day of weekRange (Monday-
 * Friday) plus their week total and over-cap flag — what both the
 * report tab and the email are built from.
 */
function buildWeeklyTotalsResults(sheet, weekRange) {
  const columnIndexes = getColumnIndexes(sheet);
  const nameColumnIndex = columnIndexes.Name;
  const maxWeeklyHoursColumnIndex = columnIndexes[MAX_WEEKLY_HOURS_HEADER];

  if (nameColumnIndex === undefined) {
    throw new Error('The sheet must contain a "Name" header.');
  }

  const weekDateStrings = [];
  const cursor = new Date(weekRange.weekStart);

  while (cursor <= weekRange.weekEnd) {
    weekDateStrings.push(Utilities.formatDate(cursor, Session.getScriptTimeZone(), 'M/d/yyyy'));
    cursor.setDate(cursor.getDate() + 1);
  }

  const lastRow = sheet.getLastRow();
  const results = [];

  if (lastRow < 2) {
    return results;
  }

  // One bulk read instead of a read per cell — this also runs on
  // demand from the dashboard (generateReportForWeek), where a read per
  // cell could outlast the website's request timeout.
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  rows.forEach((row, index) => {
    const personRowNumber = index + 2;
    const name = String(row[nameColumnIndex]).trim();

    if (!name) {
      return;
    }

    const dailyHours = []; // one entry per weekday, null if no recorded hours that day
    let weekTotal = 0;

    weekDateStrings.forEach((dateString) => {
      const dateColumnIndex = columnIndexes[dateString];
      let hoursForDay = null;

      if (dateColumnIndex !== undefined) {
        const cellValue = row[dateColumnIndex];

        if (cellValue !== '' && cellValue !== null) {
          const attendanceData = parseAttendanceData(cellValue, personRowNumber);

          if (attendanceData && typeof attendanceData['total hour worked decimal'] === 'number') {
            hoursForDay = attendanceData['total hour worked decimal'];
          }
        }
      }

      dailyHours.push(hoursForDay);

      if (hoursForDay !== null) {
        weekTotal += hoursForDay;
      }
    });

    const maxWeeklyHoursValue =
      maxWeeklyHoursColumnIndex !== undefined
        ? row[maxWeeklyHoursColumnIndex]
        : '';
    const maxWeeklyHours =
      maxWeeklyHoursValue !== '' && maxWeeklyHoursValue !== null ? Number(maxWeeklyHoursValue) : null;
    const overCap = maxWeeklyHours !== null && weekTotal > maxWeeklyHours;

    results.push({
      name: name,
      dailyHours: dailyHours,
      weekTotal: weekTotal,
      maxWeeklyHours: maxWeeklyHours,
      overCap: overCap,
    });
  });

  return results;
}

/**
 * Builds a spreadsheet-safe tab name for a given work week, e.g.
 * "Week of 9-7-2026 to 9-11-2026". Slashes aren't allowed in Google
 * Sheets tab names, so dates use dashes here instead of "M/d/yyyy".
 */
function getWeekTabName(weekRange) {
  const startText = Utilities.formatDate(
    weekRange.weekStart,
    Session.getScriptTimeZone(),
    'M-d-yyyy'
  );
  const endText = Utilities.formatDate(weekRange.weekEnd, Session.getScriptTimeZone(), 'M-d-yyyy');

  return `Week of ${startText} to ${endText}`;
}

/**
 * Returns the Monday-Friday range of the current/most recent work
 * week as of referenceDate — the Friday on or before referenceDate,
 * and the Monday four days before that. If referenceDate is itself
 * a Friday, that Friday is treated as the end of the work week.
 */
function getMostRecentCompletedWeek(referenceDate) {
  const date = new Date(referenceDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  // Distance backward from referenceDate to the most recent Friday.
  const daysSinceFriday = (dayOfWeek - 5 + 7) % 7;

  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() - daysSinceFriday);
  weekEnd.setHours(0, 0, 0, 0);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 4); // Monday of that same work week

  return { weekStart: weekStart, weekEnd: weekEnd };
}

/**
 * Writes one row per person to a tab named for this specific work
 * week (e.g. "Week of 9-7-2026 to 9-11-2026"), creating that tab if
 * it doesn't exist yet. Re-running the report for the same week
 * updates existing people's rows in place rather than duplicating
 * them; a new week gets its own separate tab. Returns that tab.
 */
function writeWeeklyTotalsReport(weekRange, results) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tabName = getWeekTabName(weekRange);

  let reportSheet = spreadsheet.getSheetByName(tabName);

  if (!reportSheet) {
    reportSheet = spreadsheet.insertSheet(tabName);
    reportSheet.appendRow(['Name'].concat(WEEKDAY_LABELS, ['Total for Week', 'Over Cap']));
  }

  const lastRow = reportSheet.getLastRow();
  const existingRowByName = {};

  if (lastRow >= 2) {
    const existingNames = reportSheet.getRange(2, 1, lastRow - 1, 1).getValues();

    existingNames.forEach((row, index) => {
      const existingName = String(row[0]).trim();

      if (existingName) {
        existingRowByName[existingName] = index + 2; // sheet row number
      }
    });
  }

  results.forEach((result) => {
    const dailyValues = result.dailyHours.map((hours) =>
      hours === null ? '' : Number(hours.toFixed(2))
    );

    const roundedWeekTotal = Number(result.weekTotal.toFixed(2));

    const rowValues = [result.name].concat(dailyValues, [
      roundedWeekTotal,
      result.overCap ? 'Yes' : '',
    ]);

    const existingRowNumber = existingRowByName[result.name];

    if (existingRowNumber) {
      reportSheet.getRange(existingRowNumber, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      reportSheet.appendRow(rowValues);
    }
  });

  return reportSheet;
}

/**
 * Emails a summary of this week's report to recipient (the Friday
 * auto-report passes TIMESHEET_REPORT_EMAIL, Config.gs) — anyone over
 * their weekly hour cap is called out, since the director dashboard's
 * Weekly tab is where those actually get approved (WeekApprovals.gs).
 * Includes a link to the report tab when reportUrl is given. Does
 * nothing if the recipient is blank.
 */
function emailWeeklyTimesheet(weekRange, results, recipient, reportUrl) {
  if (!recipient) {
    return;
  }

  const timeZone = Session.getScriptTimeZone();
  const startLabel = Utilities.formatDate(weekRange.weekStart, timeZone, 'M/d/yyyy');
  const endLabel = Utilities.formatDate(weekRange.weekEnd, timeZone, 'M/d/yyyy');
  const overCapResults = results.filter((result) => result.overCap);

  const rowsHtml = results
    .map((result) => {
      const rowStyle = result.overCap ? ' style="color:#c62828;font-weight:bold;"' : '';
      const overCapText = result.overCap ? `Yes (cap: ${result.maxWeeklyHours})` : '';

      return `<tr${rowStyle}><td>${result.name}</td><td>${result.weekTotal.toFixed(
        2
      )}</td><td>${overCapText}</td></tr>`;
    })
    .join('');

  const overCapNotice =
    overCapResults.length > 0
      ? `<p><strong>${overCapResults.length} ${
          overCapResults.length === 1 ? 'person is' : 'people are'
        } over their weekly hour cap</strong> and need approval in the director dashboard's Weekly tab before this is final.</p>`
      : '';

  const htmlBody = `
    <p>Weekly timesheet for ${startLabel} - ${endLabel}.</p>
    ${reportUrl ? `<p><a href="${reportUrl}">Open the report tab</a></p>` : ''}
    ${overCapNotice}
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
      <tr><th>Name</th><th>Total Hours</th><th>Over Cap</th></tr>
      ${rowsHtml}
    </table>
  `;

  MailApp.sendEmail({
    to: recipient,
    subject: `Weekly Timesheet: ${startLabel} - ${endLabel}`,
    htmlBody: htmlBody,
  });
}

/**
 * Run this once to install the automatic weekly trigger. Safe to run
 * again later (removes any duplicate trigger for this function first).
 * Runs Friday nights, since that's the last day of the work week.
 */
function createWeeklyTotalsTrigger() {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === 'generateWeeklyTotalsReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('generateWeeklyTotalsReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(23)
    .create();
}
