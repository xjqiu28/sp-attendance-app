/**
 * ===================================================================
 * ENTRY POINTS
 * ===================================================================
 * This is the only file with code that Google actually calls
 * directly: the legacy Google Form trigger, and the web app's
 * doPost/doGet. Everything they rely on lives in the other files in
 * this project (Config.gs, Utils.gs, AttendanceLogic.gs, RosterCache.gs,
 * DirectorView.gs, EditDay.gs, WeekApprovals.gs, AutoSignOut.gs,
 * Applications.gs, WeeklyReport.gs, PersonalCodes.gs) — Apps Script
 * treats every .gs file in the project as one shared global scope, so
 * splitting the code up like this doesn't require any imports.
 */

/**
 * ===================================================================
 * ORIGINAL FORM-TRIGGER VERSION (kept as-is, still works if you keep
 * a Google Form pointed at this sheet with an installable "On form
 * submit" trigger calling myFunction).
 * ===================================================================
 *
 * Runs when the Google Form is submitted.
 *
 * Required sheet headers:
 * - Name
 * - Personal Code
 *
 * The script creates a date column for each day.
 *
 * Attendance behavior:
 * - If yesterday has a sign-in but no sign-out,
 *   today's submission becomes yesterday's sign-out.
 * - Otherwise, the first submission today records sign-in.
 * - The second submission today records sign-out.
 */
function myFunction(formSubmitEvent) {
  try {
    Logger.log('===== FORM SUBMISSION START =====');

    const sheet = formSubmitEvent.range.getSheet();
    const submittedRowNumber = formSubmitEvent.range.getRow();

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

    const submittedName = String(
      sheet.getRange(submittedRowNumber, nameColumnIndex + 1).getValue()
    ).trim();

    const submittedPersonalCode = String(
      sheet.getRange(submittedRowNumber, personalCodeColumnIndex + 1).getValue()
    ).trim();

    const lastRow = sheet.getLastRow();
    let matchingPersonFound = false;

    for (let personRowNumber = 2; personRowNumber <= lastRow; personRowNumber++) {
      if (personRowNumber === submittedRowNumber) {
        continue;
      }

      const storedName = String(
        sheet.getRange(personRowNumber, nameColumnIndex + 1).getValue()
      ).trim();

      const storedPersonalCode = String(
        sheet.getRange(personRowNumber, personalCodeColumnIndex + 1).getValue()
      ).trim();

      if (storedName.toLowerCase() !== submittedName.toLowerCase()) {
        continue;
      }

      matchingPersonFound = true;

      if (storedPersonalCode !== submittedPersonalCode) {
        Logger.log(`Personal code mismatch for ${submittedName}. Attendance was not recorded.`);
        deleteSelectedRow(sheet, submittedRowNumber);
        return;
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
              currentTime
            );
            deleteSelectedRow(sheet, submittedRowNumber);
            return;
          }
        }
      }

      const attendanceCell = sheet.getRange(personRowNumber, todayColumnIndex + 1);
      recordAttendanceEntry(personRowNumber, attendanceCell);
      deleteSelectedRow(sheet, submittedRowNumber);
      return;
    }

    if (!matchingPersonFound) {
      Logger.log(`No matching person found for submitted name: ${submittedName}`);
      deleteSelectedRow(sheet, submittedRowNumber);
    }
  } catch (error) {
    Logger.log(`ERROR: ${error.message}`);
    Logger.log(error.stack);
    throw error;
  }
}

/**
 * ===================================================================
 * WEB APP ENTRY POINT
 * ===================================================================
 * This is what your website calls instead of a Google Form. It reuses
 * every helper function in the other files unchanged. The key
 * difference from the form-trigger flow: nothing is ever written to
 * the sheet until the name + personal code are confirmed valid, so
 * there's no "write a row then delete it" step needed.
 *
 * SHEET NAME: SHEET_NAME lives in Config.gs and must match your
 * sheet's tab name exactly ("Form Responses 1" by default).
 *
 * DEPLOY:
 * Deploy > New deployment > Web app > Execute as: Me > Who has
 * access: Anyone. Copy the URL into your website's fetch() call.
 * Re-deploy (new version) any time you edit this project.
 */
function doPost(e) {
  let output;

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    const submittedName = String(data.name || '').trim();
    const submittedPersonalCode = String(data.code || '').trim();

    if (!submittedName || !submittedPersonalCode) {
      output = { success: false, error: 'Please enter your name and personal code.' };
    } else if (action === 'directorView') {
      const requestedView = data.view === 'weekly' ? 'weekly' : 'daily';
      output = getDirectorAttendanceView(
        submittedName,
        submittedPersonalCode,
        requestedView,
        data.weekNumber
      );
    } else if (action === 'editDayView') {
      output = getEditDayView(submittedName, submittedPersonalCode, data.date);
    } else if (action === 'updateAttendanceEntry') {
      output = updateAttendanceEntry(
        submittedName,
        submittedPersonalCode,
        data.targetName,
        data.date,
        data.signInTime,
        data.signOutTime
      );
    } else if (action === 'approveWeek') {
      output = approveWeek(submittedName, submittedPersonalCode, data.targetName, data.weekStart);
    } else if (action === 'unapproveWeek') {
      output = unapproveWeek(submittedName, submittedPersonalCode, data.targetName, data.weekStart);
    } else if (action === 'applicationsView') {
      output = getApplicationsView(submittedName, submittedPersonalCode);
    } else if (action === 'updateApplication') {
      output = updateApplication(submittedName, submittedPersonalCode, data.targetEmail, data.updates);
    } else if (action === 'syncScheduledTimes') {
      output = syncScheduledTimes(submittedName, submittedPersonalCode);
    } else if (action === 'sendOfferLetters') {
      output = sendOfferLetterEmails(submittedName, submittedPersonalCode);
    } else if (action === 'checkOfferReplies') {
      output = checkOfferReplies(submittedName, submittedPersonalCode);
    } else if (action === 'generateReport') {
      output = generateReportForWeek(submittedName, submittedPersonalCode, data.weekStart, data.email);
    } else if (action === 'generateCodes') {
      output = generatePersonalCodesFromBirthdays(submittedName, submittedPersonalCode);
    } else {
      output = processAttendanceSubmission(submittedName, submittedPersonalCode, data.direction);
    }
  } catch (error) {
    output = { success: false, error: 'Server error: ' + error.message };
  }

  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Hitting the deployed URL in a browser confirms it's live. Add
// ?action=getNames to the URL and it returns the name list for the dropdown.
function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : undefined;

  if (action === 'getNames') {
    return ContentService.createTextOutput(
      JSON.stringify({ names: getNamesList() })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: 'Attendance service is running.' })
  ).setMimeType(ContentService.MimeType.JSON);
}
