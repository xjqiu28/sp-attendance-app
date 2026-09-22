import { useState } from 'react';
import {
  getDirectorView,
  generatePersonalCodes,
  getEditDayView,
  updateAttendanceEntry,
  approveWeek,
  unapproveWeek,
  getApplicationsView,
  updateApplication,
  syncScheduledTimes,
  sendOfferLetters,
  checkOfferReplies,
} from '../api/attendanceApi.js';
import { toBackendDate, toBackendDateTime, todayDateInputValue } from '../utils/dateTimeFormat.js';

function networkErrorText(err) {
  return err.name === 'AbortError'
    ? 'This is taking too long. Please try again.'
    : 'Network error — please try again.';
}

const VIEW_MODE_KEY = 'sp-attendance-director-view-mode';

function readStoredViewMode() {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === 'list' ? 'list' : 'card';
  } catch {
    return 'card';
  }
}

// All state + network calls for the director dashboard, kept out of
// the component so DirectorDashboard.jsx can stay focused on layout.
//
// Each mode's data is cached once fetched (dailyData, weeklyDataByWeek,
// editDayDataByDate, applicationsData) so switching between tabs you've
// already visited shows the cached result instantly instead of
// re-fetching every time — a mode is only re-fetched when it has never
// been loaded, when a param changes to a value not yet cached (a new
// week or date), or when handleRefresh explicitly forces it. Logging
// out clears every cache since the next login could be a different
// director/dataset.
export default function useDirectorDashboard() {
  const [selectedName, setSelectedName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { text, type: 'error' }

  // Once logged in, the validated credentials are kept here so the
  // Daily/Weekly toggle and week picker can re-fetch without asking again.
  const [credentials, setCredentials] = useState(null); // { name, code }
  const [mode, setMode] = useState('daily'); // 'daily' | 'weekly' | 'edit' | 'applications'
  // Applies across all modes — how densely entries are shown, not
  // which entries. Persisted since it's a display preference, not
  // per-session state.
  const [viewMode, setViewMode] = useState(readStoredViewMode); // 'card' | 'list'

  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(null);

  // Keyed by weekNumber so revisiting a previously-viewed week (via the
  // Weekly tab or the week picker) never re-fetches it.
  const [weeklyDataByWeek, setWeeklyDataByWeek] = useState({});
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(null);

  const dashboardData = mode === 'weekly' ? weeklyDataByWeek[currentWeekNumber] ?? null : dailyData;
  const dashboardLoading = mode === 'weekly' ? weeklyLoading : dailyLoading;
  const dashboardError = mode === 'weekly' ? weeklyError : dailyError;

  const [generateCodesState, setGenerateCodesState] = useState({
    loading: false,
    message: null,
    error: null,
  });

  // 'Edit Day' mode's own date + data, kept separate from the
  // daily/weekly data above since it's fetched independently. Keyed by
  // backend date string so switching back to an already-viewed date
  // doesn't re-fetch it.
  const [editDate, setEditDate] = useState(todayDateInputValue()); // <input type="date"> value
  const [editDayDataByDate, setEditDayDataByDate] = useState({});
  const [editDayLoading, setEditDayLoading] = useState(false);
  const [editDayError, setEditDayError] = useState(null);

  const editDayData = editDayDataByDate[toBackendDate(editDate)] ?? null;

  // 'Applications' mode's own data, independent of the others.
  const [applicationsData, setApplicationsData] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState(null);
  const [syncScheduleState, setSyncScheduleState] = useState({
    loading: false,
    message: null,
    error: null,
  });
  const [offerLettersState, setOfferLettersState] = useState({
    loading: false,
    message: null,
    error: null,
  });
  const [offerRepliesState, setOfferRepliesState] = useState({
    loading: false,
    message: null,
    error: null,
  });

  async function loadDaily(activeCredentials, options = {}) {
    if (!options.force && dailyData) {
      return;
    }

    setDailyLoading(true);
    setDailyError(null);

    try {
      const result = await getDirectorView(activeCredentials.name, activeCredentials.code, 'daily');

      if (result.success) {
        setDailyData(result);
      } else {
        setDailyError(result.error);
      }
    } catch (err) {
      setDailyError(networkErrorText(err));
    } finally {
      setDailyLoading(false);
    }
  }

  // weekNumber omitted fetches the most recent week — pass options.force
  // to re-fetch even if that week is already cached (e.g. Refresh).
  async function loadWeekly(activeCredentials, weekNumber, options = {}) {
    if (!options.force && weekNumber !== undefined && weeklyDataByWeek[weekNumber]) {
      setCurrentWeekNumber(weekNumber);
      return;
    }

    setWeeklyLoading(true);
    setWeeklyError(null);

    try {
      const result = await getDirectorView(activeCredentials.name, activeCredentials.code, 'weekly', weekNumber);

      if (result.success) {
        setWeeklyDataByWeek((previous) => ({ ...previous, [result.weekNumber]: result }));
        setCurrentWeekNumber(result.weekNumber);
      } else {
        setWeeklyError(result.error);
      }
    } catch (err) {
      setWeeklyError(networkErrorText(err));
    } finally {
      setWeeklyLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (!selectedName || !trimmedCode) {
      setStatus({ text: 'Please select your name and enter your personal code.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setStatus({ text: 'Checking...', type: '' });

    try {
      const result = await getDirectorView(selectedName, trimmedCode, 'daily');

      if (result.success) {
        setStatus(null);
        setCredentials({ name: selectedName, code: trimmedCode });
        setMode('daily');
        setDailyData(result);
      } else {
        setStatus({ text: result.error, type: 'error' });
      }
    } catch (err) {
      setStatus({ text: networkErrorText(err), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleModeChange(newMode) {
    if (!credentials) {
      return;
    }

    setMode(newMode);

    if (newMode === 'edit') {
      loadEditDay(credentials, editDate);
    } else if (newMode === 'applications') {
      loadApplications(credentials);
    } else if (newMode === 'daily') {
      loadDaily(credentials);
    } else if (newMode === 'weekly') {
      loadWeekly(credentials, currentWeekNumber ?? undefined);
    }
  }

  function handleViewModeChange(newViewMode) {
    setViewMode(newViewMode);

    try {
      localStorage.setItem(VIEW_MODE_KEY, newViewMode);
    } catch {
      // Storage unavailable (private browsing, quota, etc) — the
      // preference just won't survive a reload, which is fine.
    }
  }

  function handleWeekChange(weekNumber) {
    if (!credentials) {
      return;
    }

    loadWeekly(credentials, weekNumber);
  }

  // Re-fetches whatever's currently on screen, ignoring any cache —
  // the escape hatch for when a director wants to confirm they're
  // looking at up-to-date data (e.g. Daily's live sign-in status)
  // instead of a possibly-stale cached view.
  function handleRefresh() {
    if (!credentials) {
      return;
    }

    if (mode === 'daily') {
      loadDaily(credentials, { force: true });
    } else if (mode === 'weekly') {
      loadWeekly(credentials, currentWeekNumber ?? undefined, { force: true });
    } else if (mode === 'edit') {
      loadEditDay(credentials, editDate, { force: true });
    } else if (mode === 'applications') {
      loadApplications(credentials, { force: true });
    }
  }

  async function loadEditDay(activeCredentials, dateInputValue, options = {}) {
    const backendDate = toBackendDate(dateInputValue);

    if (!options.force && editDayDataByDate[backendDate]) {
      return;
    }

    setEditDayLoading(true);
    setEditDayError(null);

    try {
      const result = await getEditDayView(activeCredentials.name, activeCredentials.code, backendDate);

      if (result.success) {
        setEditDayDataByDate((previous) => ({ ...previous, [backendDate]: result }));
      } else {
        setEditDayError(result.error);
      }
    } catch (err) {
      setEditDayError(networkErrorText(err));
    } finally {
      setEditDayLoading(false);
    }
  }

  function handleEditDateChange(newDateInputValue) {
    setEditDate(newDateInputValue);
    loadEditDay(credentials, newDateInputValue);
  }

  // Always resolves (never rejects) with { success, message } or
  // { success: false, error } — including on a network failure — so
  // the calling card can show its own inline feedback without needing
  // its own try/catch.
  async function handleSaveEntry(targetName, signInInputValue, signOutInputValue) {
    const backendDate = toBackendDate(editDate);
    const signInTime = toBackendDateTime(editDate, signInInputValue);
    const signOutTime = toBackendDateTime(editDate, signOutInputValue);

    let result;

    try {
      result = await updateAttendanceEntry(
        credentials.name,
        credentials.code,
        targetName,
        backendDate,
        signInTime,
        signOutTime
      );
    } catch (err) {
      return { success: false, error: networkErrorText(err) };
    }

    if (result.success) {
      setEditDayDataByDate((previous) => ({
        ...previous,
        [backendDate]: {
          ...previous[backendDate],
          entries: previous[backendDate].entries.map((entry) =>
            entry.name === targetName
              ? { ...entry, signInTime: signInTime || null, signOutTime: signOutTime || null, sessions: null }
              : entry
          ),
        },
      }));

      // An edited attendance record can change what Daily/Weekly would
      // show (late flags, totals, who's signed in) — drop those caches
      // so the next visit re-fetches instead of showing stale data.
      setDailyData(null);
      setWeeklyDataByWeek({});
    }

    return result;
  }

  // Always resolves (never rejects) with { success, message,
  // approvedBy, approvedAt } or { success: false, error } — same
  // pattern as handleSaveEntry — so WeeklyTotalCard can show its own
  // inline feedback without needing its own try/catch.
  async function handleApproveWeek(targetName, weekStart) {
    let result;

    try {
      result = await approveWeek(credentials.name, credentials.code, targetName, weekStart);
    } catch (err) {
      return { success: false, error: networkErrorText(err) };
    }

    if (result.success) {
      setWeeklyDataByWeek((previous) => ({
        ...previous,
        [currentWeekNumber]: {
          ...previous[currentWeekNumber],
          entries: previous[currentWeekNumber].entries.map((entry) =>
            entry.name === targetName
              ? { ...entry, approval: { approvedBy: result.approvedBy, approvedAt: result.approvedAt } }
              : entry
          ),
        },
      }));
    }

    return result;
  }

  // Same always-resolves pattern as handleApproveWeek.
  async function handleUnapproveWeek(targetName, weekStart) {
    let result;

    try {
      result = await unapproveWeek(credentials.name, credentials.code, targetName, weekStart);
    } catch (err) {
      return { success: false, error: networkErrorText(err) };
    }

    if (result.success) {
      setWeeklyDataByWeek((previous) => ({
        ...previous,
        [currentWeekNumber]: {
          ...previous[currentWeekNumber],
          entries: previous[currentWeekNumber].entries.map((entry) =>
            entry.name === targetName ? { ...entry, approval: null } : entry
          ),
        },
      }));
    }

    return result;
  }

  async function loadApplications(activeCredentials, options = {}) {
    if (!options.force && applicationsData) {
      return;
    }

    setApplicationsLoading(true);
    setApplicationsError(null);

    try {
      const result = await getApplicationsView(activeCredentials.name, activeCredentials.code);

      if (result.success) {
        setApplicationsData(result);
      } else {
        setApplicationsError(result.error);
      }
    } catch (err) {
      setApplicationsError(networkErrorText(err));
    } finally {
      setApplicationsLoading(false);
    }
  }

  // Same always-resolves pattern as handleSaveEntry/handleApproveWeek.
  async function handleUpdateApplication(targetEmail, updates) {
    let result;

    try {
      result = await updateApplication(credentials.name, credentials.code, targetEmail, updates);
    } catch (err) {
      return { success: false, error: networkErrorText(err) };
    }

    if (result.success) {
      setApplicationsData((previous) => ({
        ...previous,
        applications: previous.applications.map((application) =>
          application.email === targetEmail ? { ...application, ...updates } : application
        ),
      }));
    }

    return result;
  }

  async function handleSyncScheduledTimes() {
    if (!credentials) {
      return;
    }

    setSyncScheduleState({ loading: true, message: null, error: null });

    try {
      const result = await syncScheduledTimes(credentials.name, credentials.code);

      if (result.success) {
        const summary =
          result.updatedNames.length > 0
            ? `Synced ${result.updatedNames.length} ${result.updatedNames.length === 1 ? 'person' : 'people'}.`
            : 'Nothing to sync.';
        const skippedNote =
          result.skippedNames.length > 0
            ? ` Skipped (no Time set, or no matching attendance roster name): ${result.skippedNames.join(', ')}.`
            : '';

        setSyncScheduleState({ loading: false, message: summary + skippedNote, error: null });

        // Scheduled sign-in/out changes affect Daily/Weekly's late
        // detection — drop those caches so they re-fetch fresh too.
        setDailyData(null);
        setWeeklyDataByWeek({});
      } else {
        setSyncScheduleState({ loading: false, message: null, error: result.error });
      }
    } catch (err) {
      setSyncScheduleState({ loading: false, message: null, error: networkErrorText(err) });
    }
  }

  // Sending letters/checking replies both change columns on applicant
  // rows already loaded into applicationsData (Sent, Accept/Decline) —
  // simplest to just reload the whole view afterward rather than
  // trying to patch individual entries from a bare name/email list.
  async function handleSendOfferLetters() {
    if (!credentials) {
      return;
    }

    setOfferLettersState({ loading: true, message: null, error: null });

    try {
      const result = await sendOfferLetters(credentials.name, credentials.code);

      if (result.success) {
        const summary =
          result.sentTo.length > 0
            ? `Sent ${result.sentTo.length} offer letter${result.sentTo.length === 1 ? '' : 's'}: ${result.sentTo.join(', ')}.`
            : 'Nothing to send — everyone already has one.';
        const skippedNote =
          result.skipped.length > 0 ? ` Skipped (invalid/missing email): ${result.skipped.join(', ')}.` : '';

        setOfferLettersState({ loading: false, message: summary + skippedNote, error: null });
        loadApplications(credentials, { force: true });
      } else {
        setOfferLettersState({ loading: false, message: null, error: result.error });
      }
    } catch (err) {
      setOfferLettersState({ loading: false, message: null, error: networkErrorText(err) });
    }
  }

  async function handleCheckOfferReplies() {
    if (!credentials) {
      return;
    }

    setOfferRepliesState({ loading: true, message: null, error: null });

    try {
      const result = await checkOfferReplies(credentials.name, credentials.code);

      if (result.success) {
        const summary =
          result.updatedEmails.length > 0
            ? `Updated ${result.updatedEmails.length} ${result.updatedEmails.length === 1 ? 'reply' : 'replies'}: ${result.updatedEmails.join(', ')}.`
            : 'No new replies found.';

        setOfferRepliesState({ loading: false, message: summary, error: null });
        loadApplications(credentials, { force: true });
      } else {
        setOfferRepliesState({ loading: false, message: null, error: result.error });
      }
    } catch (err) {
      setOfferRepliesState({ loading: false, message: null, error: networkErrorText(err) });
    }
  }

  function handleLogOut() {
    setCredentials(null);
    setCode('');
    setGenerateCodesState({ loading: false, message: null, error: null });
    setDailyData(null);
    setDailyError(null);
    setWeeklyDataByWeek({});
    setWeeklyError(null);
    setCurrentWeekNumber(null);
    setEditDayDataByDate({});
    setEditDayError(null);
    setApplicationsData(null);
    setApplicationsError(null);
    setSyncScheduleState({ loading: false, message: null, error: null });
    setOfferLettersState({ loading: false, message: null, error: null });
    setOfferRepliesState({ loading: false, message: null, error: null });
  }

  async function handleGenerateCodes() {
    if (!credentials) {
      return;
    }

    setGenerateCodesState({ loading: true, message: null, error: null });

    try {
      const result = await generatePersonalCodes(credentials.name, credentials.code);

      if (result.success) {
        setGenerateCodesState({ loading: false, message: result.message, error: null });
      } else {
        setGenerateCodesState({ loading: false, message: null, error: result.error });
      }
    } catch (err) {
      setGenerateCodesState({ loading: false, message: null, error: networkErrorText(err) });
    }
  }

  return {
    selectedName,
    setSelectedName,
    code,
    setCode,
    submitting,
    status,
    credentials,
    mode,
    viewMode,
    dashboardData,
    dashboardLoading,
    dashboardError,
    generateCodesState,
    editDate,
    editDayData,
    editDayLoading,
    editDayError,
    applicationsData,
    applicationsLoading,
    applicationsError,
    syncScheduleState,
    offerLettersState,
    offerRepliesState,
    handleSubmit,
    handleModeChange,
    handleViewModeChange,
    handleWeekChange,
    handleRefresh,
    handleLogOut,
    handleGenerateCodes,
    handleEditDateChange,
    handleSaveEntry,
    handleApproveWeek,
    handleUnapproveWeek,
    handleUpdateApplication,
    handleSyncScheduledTimes,
    handleSendOfferLetters,
    handleCheckOfferReplies,
  };
}
