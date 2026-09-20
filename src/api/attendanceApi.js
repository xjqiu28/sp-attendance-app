import { WEB_APP_URL, REQUEST_TIMEOUT_MS } from '../config.js';

// Wraps fetch with a hard timeout so a stalled connection can never
// leave the UI stuck waiting forever — it always eventually resolves
// or throws (with err.name === 'AbortError' on timeout).
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchNames() {
  const response = await fetchWithTimeout(`${WEB_APP_URL}?action=getNames`);
  const result = await response.json();
  return result.names || [];
}

// Returns { success: true, message } or { success: false, error }.
// Throws (with err.name === 'AbortError' on timeout) on network failure.
export async function submitAttendance(name, code) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    // Content-Type text/plain avoids a CORS preflight request, which
    // Apps Script web apps don't handle. The script still parses the
    // body as JSON on its end.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ name, code }),
  });

  return response.json();
}

// Daily: returns { success: true, date, entries: [{ name, signInTime,
// signOutTime, totalHoursDecimal, totalHoursFormatted, status, isLate,
// lateBy: { hours, minutes, formatted } | null }], totalRoster,
// totalSignedIn, absentNames, lateNames: [{ name, lateBy }].
// Weekly: returns { success: true, weekNumber, weekStart, weekEnd,
// availableWeeks: [{ weekNumber, weekStart, weekEnd, label }], entries:
// [{ name, weekTotalHours, weekTotalFormatted, days, maxWeeklyHours,
// overCap, approval: { approvedBy, approvedAt } | null }] }. Pass weekNumber
// to view a specific week (from availableWeeks); omitted, it defaults to
// the most recent week. Either way, or { success: false, error } on
// rejection. Read-only — never writes to the sheet. Throws (with
// err.name === 'AbortError' on timeout) on network failure.
export async function getDirectorView(name, code, view = 'daily', weekNumber) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'directorView', name, code, view, weekNumber }),
  });

  return response.json();
}

// Returns { success: true, date, entries: [{ name, signInTime,
// signOutTime }] } for every roster name (blank if nothing recorded
// yet) for one specific date. Director-only, read-only. Throws (with
// err.name === 'AbortError' on timeout) on network failure.
export async function getEditDayView(name, code, date) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'editDayView', name, code, date }),
  });

  return response.json();
}

// Overwrites one person's sign-in/sign-out for one date — pass '' for
// either time to clear it (both blank clears the entry entirely).
// Director-only. Returns { success: true, message } or { success:
// false, error }. Throws (with err.name === 'AbortError' on timeout)
// on network failure.
export async function updateAttendanceEntry(name, code, targetName, date, signInTime, signOutTime) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'updateAttendanceEntry',
      name,
      code,
      targetName,
      date,
      signInTime,
      signOutTime,
    }),
  });

  return response.json();
}

// Records that name/code (a director) approved targetName's week
// starting weekStart (the "M/d/yyyy" weekStart a getDirectorView weekly
// call returned). Director-only. Returns { success: true, message,
// approvedBy, approvedAt } or { success: false, error }. Throws (with
// err.name === 'AbortError' on timeout) on network failure.
export async function approveWeek(name, code, targetName, weekStart) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'approveWeek', name, code, targetName, weekStart }),
  });

  return response.json();
}

// Removes a previously recorded approval for targetName's weekStart, if
// any — a no-op success if there wasn't one. Director-only. Returns
// { success: true, message } or { success: false, error }. Throws
// (with err.name === 'AbortError' on timeout) on network failure.
export async function unapproveWeek(name, code, targetName, weekStart) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'unapproveWeek', name, code, targetName, weekStart }),
  });

  return response.json();
}

// Returns { success: true, tabName, applications: [{ firstName,
// lastName, title, dateInformation, time, rate, email, sent, paidHours,
// volunteerHours, missingDocuments, acceptDecline, ss, w4Forms,
// resignationEmailSent, resignationLetters }] } for the current year's
// Applications tab. Director-only, read-only. Throws (with
// err.name === 'AbortError' on timeout) on network failure.
export async function getApplicationsView(name, code) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'applicationsView', name, code }),
  });

  return response.json();
}

// Updates one applicant's editable tracking fields (matched by email).
// updates uses the same field names getApplicationsView returns, e.g.
// { missingDocuments, acceptDecline, ss, w4Forms, resignationEmailSent,
// resignationLetters } — include only the fields you're changing.
// Director-only. Returns { success: true, message } or { success:
// false, error }. Throws (with err.name === 'AbortError' on timeout)
// on network failure.
export async function updateApplication(name, code, targetEmail, updates) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateApplication', name, code, targetEmail, updates }),
  });

  return response.json();
}

// Pulls First Name + Last Name + Time from the current year's
// Applications tab and writes each matching person's Scheduled Sign
// In/Scheduled Sign Out on the attendance roster. Director-only.
// Returns { success: true, updatedNames, skippedNames } or
// { success: false, error }. Throws (with err.name === 'AbortError' on
// timeout) on network failure.
export async function syncScheduledTimes(name, code) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'syncScheduledTimes', name, code }),
  });

  return response.json();
}

// Emails an offer letter to every applicant whose Sent column isn't
// already "sent" (safe to run repeatedly — already-sent applicants are
// skipped). Director-only. Returns { success: true, sentTo, skipped }
// or { success: false, error }. Throws (with err.name === 'AbortError'
// on timeout) on network failure.
export async function sendOfferLetters(name, code) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'sendOfferLetters', name, code }),
  });

  return response.json();
}

// Scans Gmail for unread offer-letter replies and fills in each
// matching applicant's Accept/Decline column. Director-only. Returns
// { success: true, updatedEmails } or { success: false, error }.
// Throws (with err.name === 'AbortError' on timeout) on network
// failure.
export async function checkOfferReplies(name, code) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'checkOfferReplies', name, code }),
  });

  return response.json();
}

// Fills in a Personal Code (birthday as MMDDYYYY) on the sheet for
// every roster name that doesn't have one yet; existing codes are
// never touched. Returns { success: true, message, generatedNames,
// skippedNames } or { success: false, error }. Throws (with
// err.name === 'AbortError' on timeout) on network failure.
export async function generatePersonalCodes(name, code) {
  const response = await fetchWithTimeout(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'generateCodes', name, code }),
  });

  return response.json();
}
