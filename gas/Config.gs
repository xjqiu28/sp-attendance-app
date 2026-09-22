/**
 * ===================================================================
 * SHARED CONSTANTS
 * ===================================================================
 * Every other file in this project reads these instead of hardcoding
 * their own copies.
 */

// The tab that receives form submissions. A Google Form linked to a
// Sheet always names that tab "Form Responses 1" by default — keep
// this in sync with whatever your actual tab is named.
const SHEET_NAME = 'Form Responses 1';

// Used by the Friday auto-report (see WeeklyReport.gs), which only
// summarizes the Monday-Friday work week.
const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Sign-ins recorded after this hour are flagged late (red text on the
// sheet, "Late" badge on the director dashboard, and included in the
// dashboard's "Signed In Late" list).
const SIGN_IN_CUTOFF_HOUR = 9;

// Anyone still signed in (no sign-out yet) at this time gets
// automatically signed out — see AutoSignOut.gs.
const AUTO_SIGN_OUT_HOUR = 18;
const AUTO_SIGN_OUT_MINUTE = 30;

// Optional roster column: a person's own weekly hour cap. Read by
// buildDirectorWeeklyResult (DirectorView.gs) and the Friday auto-report
// (WeeklyReport.gs) to flag weeks that go over it.
const MAX_WEEKLY_HOURS_HEADER = 'Max Weekly Hours';

// Where an over-cap week's approval (director name + timestamp) is
// recorded — see WeekApprovals.gs. The tab is created automatically.
const WEEK_APPROVALS_SHEET_NAME = 'Week Approvals';

// Recipient for the Friday auto-report's emailed timesheet (see
// WeeklyReport.gs). Leave blank ('') to skip emailing and only write
// the report tab.
const TIMESHEET_REPORT_EMAIL = 'wendy@occny.org';

// Optional roster columns: a person's own scheduled shift, synced in
// from the Applications sheet's "Time" column (see Applications.gs)
// and used instead of SIGN_IN_CUTOFF_HOUR/AUTO_SIGN_OUT_HOUR for
// anyone who has one. Stored as plain time-of-day text (e.g.
// "9:00 AM"), not a full date, since the same schedule applies every
// working day.
const SCHEDULED_SIGN_IN_HEADER = 'Scheduled Sign In';
const SCHEDULED_SIGN_OUT_HEADER = 'Scheduled Sign Out';

// Optional roster column: the hours someone is expected to be in, as
// free text like "10AM - 3PM" or "07:30AM - 06:15PM" (see
// parseWorkHours, Utils.gs). Only drives the director dashboard's
// arrived early/late and left early/stayed late notes — the Late
// badge and auto sign-out still use the Scheduled Sign In/Out columns
// above.
const WORK_HOURS_HEADER = 'Work Hours';

// How many minutes after their Work Hours start counts as late for the
// "Arrived late" note — 10 means 10:09 for a 10:00 start gets no note,
// 10:10 does. The other notes (arrived early, left early, stayed late)
// show from 1 minute.
const WORK_HOURS_LATE_THRESHOLD_MINUTES = 10;

// ===================================================================
// APPLICATIONS (see Applications.gs)
// ===================================================================
// A separate spreadsheet from the attendance roster — deliberately:
// it holds SSN/pay/tax-form status for applicants and staff, and this
// script also runs a public, unauthenticated web app, so the two are
// kept in different files rather than different tabs of the same one.
//
// One tab per year (a new one created each summer, old ones left
// alone), named "<year> Applications" — e.g. "2026 Applications" —
// so the code always finds the right one with no manual config change
// needed year to year.
//
// The spreadsheet's own ID is deliberately NOT here — it's read from a
// script property instead (see getApplicationsSpreadsheet, Applications.gs)
// so it never lands in git and each deployment (prod/dev) can point at
// its own sheet independently.
const APPLICATIONS_TAB_SUFFIX = 'Applications';

// Column headers on that sheet, exactly as they appear there.
const APPLICATIONS_HEADERS = {
  firstName: 'First Name',
  lastName: 'Last Name',
  title: 'Title',
  dateInformation: 'Date Information',
  time: 'Time',
  rate: 'Rate',
  email: 'Email',
  sent: 'Sent',
  paidHours: 'Paid Hours',
  volunteerHours: 'Volunteer Hours',
  missingDocuments: 'Missing Documents',
  acceptDecline: 'Accept/Decline',
  ss: 'SS',
  w4Forms: 'W-4 Forms',
};

// ===================================================================
// OFFER LETTERS (see Applications.gs's sendOfferLetterEmails)
// ===================================================================
// The subject line's "Summer Paradise Offer Letter" text is also what
// checkOfferReplies searches Gmail for — keep that phrase in sync if
// it's ever changed. Everything below is specific to this year's
// calendar and needs updating each summer before sending offer letters.
const OFFER_LETTER_SENDER_NAME = 'Wendy Wong';
const OFFER_LETTER_REPLY_DEADLINE = '6/25';
const OFFER_LETTER_TRAINING_DATE = '6/19 (Friday) from 10:00am to 4:00pm';
const OFFER_LETTER_TRAINING_LOCATION = '4300 171st Street, Flushing, NY 11358 (Logos Community Church)';
const OFFER_LETTER_W4_SS_DEADLINE = '6/5';
const OFFER_LETTER_REFERENCE_DEADLINE = '6/26';
const OFFER_LETTER_MISSING_DOCS_DEADLINE = '6/26';
const OFFER_LETTER_ATTENDANCE_FORM_URL = 'https://forms.gle/GwwXfUto9JrbBrxr6';
