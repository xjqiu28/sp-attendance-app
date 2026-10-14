import { WEB_APP_URL, REQUEST_TIMEOUT_MS } from '../config.js';

// ===================================================================
// RESPONSE TYPES
// ===================================================================
// What the Apps Script web app (gas/) sends back for each action. They
// describe the backend's return values — the compiler can't see gas/,
// so keep these in sync by hand whenever a backend response changes.

// Every action can fail with an error message — including any
// uncaught server exception, which doPost (gas/Code.gs) reports as
// "Server error: ...".
export interface Failure {
  success: false;
  error: string;
}

export type Result<T> = ({ success: true } & T) | Failure;

export interface MessageResult {
  message: string;
}

export interface WorkHoursNote {
  type: 'arrived-early' | 'arrived-late' | 'left-early' | 'stayed-late';
  text: string;
}

// getLateDuration (gas/Utils.gs).
export interface LateDuration {
  hours: number;
  minutes: number;
  formatted: string;
}

export type AttendanceStatus = 'Complete' | 'Signed In' | 'Not Signed In';

// buildDirectorAttendanceResult (gas/DirectorView.gs). Times are the
// backend's "M/d/yyyy h:mm:ss a" strings.
export interface DailyEntry {
  name: string;
  signInTime: string | null;
  signOutTime: string | null;
  totalHoursDecimal: number | null;
  totalHoursFormatted: string | null;
  status: AttendanceStatus;
  isLate: boolean;
  lateBy: LateDuration | null;
  workHours: string | null;
  workHoursNotes: WorkHoursNote[];
}

export interface DailyView {
  date: string;
  entries: DailyEntry[];
  totalRoster: number;
  totalSignedIn: number;
  absentNames: string[];
  lateNames: { name: string; lateBy: string | null }[];
}

export interface WeekOption {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  label: string;
}

export interface WeekApproval {
  approvedBy: string;
  approvedAt: string;
}

export interface WeekDay {
  label: string;
  date: string;
  signInTime: string | null;
  signOutTime: string | null;
  hoursFormatted: string | null;
  workHoursNotes: WorkHoursNote[];
}

// buildDirectorWeeklyResult (gas/DirectorView.gs).
export interface WeeklyEntry {
  name: string;
  weekTotalHours: number;
  weekTotalFormatted: string;
  workHours: string | null;
  days: WeekDay[];
  maxWeeklyHours: number | null;
  overCap: boolean;
  approval: WeekApproval | null;
}

export interface WeeklyView {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  availableWeeks: WeekOption[];
  entries: WeeklyEntry[];
}

// getEditDayView (gas/EditDay.gs). sessions is only set for a day with
// more than one sign-in/sign-out.
export interface EditDayEntry {
  name: string;
  signInTime: string | null;
  signOutTime: string | null;
  sessions: { signInTime: string | null; signOutTime: string | null }[] | null;
}

export interface EditDayView {
  date: string;
  entries: EditDayEntry[];
}

// getWorkHoursView (gas/WorkHours.gs). startTime/endTime are "HH:MM"
// (24-hour), blank when Work Hours is empty or unrecognized.
export interface WorkHoursEntry {
  name: string;
  workHours: string | null;
  startTime: string;
  endTime: string;
}

export interface WorkHoursView {
  entries: WorkHoursEntry[];
}

// What the Add Staff form sends (see addStaffMember, gas/Staff.gs).
export interface StaffInput {
  name: string;
  birthday: string; // "YYYY-MM-DD", or ''
  personalCode: string; // '' to generate it from the birthday
  startTime: string; // "HH:MM", or '' (with endTime) for no Work Hours
  endTime: string;
  maxWeeklyHours: string | number;
  isAdmin: boolean;
}

// buildApplicationEntry (gas/Applications.gs).
export interface Application {
  firstName: string;
  lastName: string;
  title: string;
  dateInformation: string;
  time: string;
  rate: number | null;
  email: string;
  sent: string;
  paidHours: string;
  volunteerHours: string;
  missingDocuments: string;
  acceptDecline: string;
  ss: string;
  w4Forms: string;
}

export type ApplicationUpdates = Partial<Pick<Application, 'missingDocuments' | 'acceptDecline' | 'ss' | 'w4Forms'>>;

export interface NameLists {
  names: string[];
  directorNames: string[];
}

// ===================================================================
// REQUESTS
// ===================================================================

// Wraps fetch with a hard timeout so a stalled connection can never
// leave the UI stuck waiting forever — it always eventually resolves
// or throws (with err.name === 'AbortError' on timeout).
async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Every POST action goes through here. Content-Type text/plain avoids
// a CORS preflight request, which Apps Script web apps don't handle.
// The script still parses the body as JSON on its end.
async function post<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });

  return response.json();
}

// Returns { names, directorNames } — everyone, and just the Admin
// names for the director login. directorNames falls back to everyone
// if the backend predates it.
export async function fetchNames(): Promise<NameLists> {
  const response = await fetchWithTimeout(`${WEB_APP_URL}?action=getNames`);
  const result: Partial<NameLists> = await response.json();
  const names = result.names || [];
  return { names, directorNames: result.directorNames || names };
}

// direction is which button was pressed. Fails with an error for e.g.
// Sign In while already signed in. Throws (with err.name ===
// 'AbortError' on timeout) on network failure — as do all the
// functions below.
export function submitAttendance(name: string, code: string, direction: 'in' | 'out') {
  return post<Result<MessageResult>>({ name, code, direction });
}

// Daily: today's attendance. Weekly: one Monday-Saturday week's totals
// — pass weekNumber (from availableWeeks) for a specific week, or omit
// it for the most recent one. Read-only.
export function getDirectorView(name: string, code: string, view?: 'daily'): Promise<Result<DailyView>>;
export function getDirectorView(name: string, code: string, view: 'weekly', weekNumber?: number): Promise<Result<WeeklyView>>;
export function getDirectorView(name: string, code: string, view: 'daily' | 'weekly' = 'daily', weekNumber?: number) {
  return post<Result<DailyView> | Result<WeeklyView>>({ action: 'directorView', name, code, view, weekNumber });
}

// Every roster name's sign-in/sign-out for one date ("M/d/yyyy").
// Director-only, read-only.
export function getEditDayView(name: string, code: string, date: string) {
  return post<Result<EditDayView>>({ action: 'editDayView', name, code, date });
}

// Overwrites one person's sign-in/sign-out for one date — pass '' for
// either time to clear it (both blank clears the entry entirely).
// Director-only.
export function updateAttendanceEntry(
  name: string,
  code: string,
  targetName: string,
  date: string,
  signInTime: string,
  signOutTime: string
) {
  return post<Result<MessageResult>>({ action: 'updateAttendanceEntry', name, code, targetName, date, signInTime, signOutTime });
}

// Every roster name with their Work Hours. Director-only, read-only.
export function getWorkHoursView(name: string, code: string) {
  return post<Result<WorkHoursView>>({ action: 'workHoursView', name, code });
}

// Overwrites targetName's Work Hours with startTime-endTime ("HH:MM") —
// pass '' for both to clear it. Director-only.
export function updateWorkHours(name: string, code: string, targetName: string, startTime: string, endTime: string) {
  return post<Result<MessageResult & { workHours: string | null }>>({
    action: 'updateWorkHours',
    name,
    code,
    targetName,
    startTime,
    endTime,
  });
}

// Adds a new person to the attendance roster. Director-only.
export function addStaff(name: string, code: string, staff: StaffInput) {
  return post<Result<MessageResult & { entry: WorkHoursEntry }>>({ action: 'addStaff', name, code, staff });
}

// Records that name/code (a director) approved targetName's week
// starting weekStart (a WeeklyView's weekStart). Director-only.
export function approveWeek(name: string, code: string, targetName: string, weekStart: string) {
  return post<Result<MessageResult & WeekApproval>>({ action: 'approveWeek', name, code, targetName, weekStart });
}

// Removes a previously recorded approval, if any — a no-op success if
// there wasn't one. Director-only.
export function unapproveWeek(name: string, code: string, targetName: string, weekStart: string) {
  return post<Result<MessageResult>>({ action: 'unapproveWeek', name, code, targetName, weekStart });
}

// The current year's Applications tab. Director-only, read-only.
export function getApplicationsView(name: string, code: string) {
  return post<Result<{ tabName: string; applications: Application[] }>>({ action: 'applicationsView', name, code });
}

// Updates one applicant's editable tracking fields (matched by email)
// — include only the fields you're changing. Director-only.
export function updateApplication(name: string, code: string, targetEmail: string, updates: ApplicationUpdates) {
  return post<Result<MessageResult>>({ action: 'updateApplication', name, code, targetEmail, updates });
}

// Pulls First Name + Last Name + Time from the current year's
// Applications tab and writes each matching person's Scheduled Sign
// In/Scheduled Sign Out on the attendance roster. Director-only.
export function syncScheduledTimes(name: string, code: string) {
  return post<Result<{ updatedNames: string[]; skippedNames: string[] }>>({ action: 'syncScheduledTimes', name, code });
}

// Emails an offer letter to every applicant whose Sent column isn't
// already "sent" (safe to run repeatedly). sentTo/skipped are applicant
// names. Director-only.
export function sendOfferLetters(name: string, code: string) {
  return post<Result<{ sentTo: string[]; skipped: string[] }>>({ action: 'sendOfferLetters', name, code });
}

// Scans Gmail for unread offer-letter replies and fills in each
// matching applicant's Accept/Decline column. Director-only.
export function checkOfferReplies(name: string, code: string) {
  return post<Result<{ updatedEmails: string[] }>>({ action: 'checkOfferReplies', name, code });
}

// Fills in a Personal Code (birthday as MMDDYYYY) for every roster
// name that doesn't have one yet; existing codes are never touched.
// Director-only.
export function generatePersonalCodes(name: string, code: string) {
  return post<Result<MessageResult & { generatedNames: string[]; skippedNames: string[] }>>({
    action: 'generateCodes',
    name,
    code,
  });
}

// Writes the weekly timesheet tab for the Monday-Friday work week
// starting on weekStart ("M/d/yyyy", a Monday). If email is given, also
// shares a standalone copy of it with that address and emails them a
// link (blank just writes the tab). Director-only.
export function generateReport(name: string, code: string, weekStart: string, email: string) {
  return post<Result<MessageResult & { tabName: string; reportUrl: string; sharedCopyUrl: string | null }>>({
    action: 'generateReport',
    name,
    code,
    weekStart,
    email,
  });
}
