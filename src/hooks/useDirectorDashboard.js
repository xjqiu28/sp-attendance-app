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
export default function useDirectorDashboard() {
  const [selectedName, setSelectedName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { text, type: 'error' }

  // Once logged in, the validated credentials are kept here so the
  // Daily/Weekly toggle and week picker can re-fetch without asking again.
  const [credentials, setCredentials] = useState(null); // { name, code }
  const [mode, setMode] = useState('daily'); // 'daily' | 'weekly' | 'edit' | 'applications'
  // Applies across all three modes — how densely entries are shown,
  // not which entries. Persisted since it's a display preference, not
  // per-session state.
  const [viewMode, setViewMode] = useState(readStoredViewMode); // 'card' | 'list'
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  const [generateCodesState, setGenerateCodesState] = useState({
    loading: false,
    message: null,
    error: null,
  });

  // 'Edit Day' mode's own date + data, kept separate from the
  // daily/weekly dashboardData above since it's fetched independently.
  const [editDate, setEditDate] = useState(todayDateInputValue()); // <input type="date"> value
  const [editDayData, setEditDayData] = useState(null);
  const [editDayLoading, setEditDayLoading] = useState(false);
  const [editDayError, setEditDayError] = useState(null);

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

  async function loadView(activeCredentials, nextMode, weekNumber) {
    setDashboardLoading(true);
    setDashboardError(null);

    try {
      const result = await getDirectorView(
        activeCredentials.name,
        activeCredentials.code,
        nextMode,
        weekNumber
      );

      if (result.success) {
        setDashboardData(result);
      } else {
        setDashboardError(result.error);
      }
    } catch (err) {
      setDashboardError(networkErrorText(err));
    } finally {
      setDashboardLoading(false);
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
        setDashboardData(result);
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
    } else {
      loadView(credentials, newMode);
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

    loadView(credentials, 'weekly', weekNumber);
  }

  async function loadEditDay(activeCredentials, dateInputValue) {
    setEditDayLoading(true);
    setEditDayError(null);

    try {
      const result = await getEditDayView(
        activeCredentials.name,
        activeCredentials.code,
        toBackendDate(dateInputValue)
      );

      if (result.success) {
        setEditDayData(result);
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
    const signInTime = toBackendDateTime(editDate, signInInputValue);
    const signOutTime = toBackendDateTime(editDate, signOutInputValue);

    let result;

    try {
      result = await updateAttendanceEntry(
        credentials.name,
        credentials.code,
        targetName,
        toBackendDate(editDate),
        signInTime,
        signOutTime
      );
    } catch (err) {
      return { success: false, error: networkErrorText(err) };
    }

    if (result.success) {
      setEditDayData((previous) => ({
        ...previous,
        entries: previous.entries.map((entry) =>
          entry.name === targetName
            ? { ...entry, signInTime: signInTime || null, signOutTime: signOutTime || null }
            : entry
        ),
      }));
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
      setDashboardData((previous) => ({
        ...previous,
        entries: previous.entries.map((entry) =>
          entry.name === targetName
            ? { ...entry, approval: { approvedBy: result.approvedBy, approvedAt: result.approvedAt } }
            : entry
        ),
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
      setDashboardData((previous) => ({
        ...previous,
        entries: previous.entries.map((entry) =>
          entry.name === targetName ? { ...entry, approval: null } : entry
        ),
      }));
    }

    return result;
  }

  async function loadApplications(activeCredentials) {
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
        loadApplications(credentials);
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
        loadApplications(credentials);
      } else {
        setOfferRepliesState({ loading: false, message: null, error: result.error });
      }
    } catch (err) {
      setOfferRepliesState({ loading: false, message: null, error: networkErrorText(err) });
    }
  }

  function handleLogOut() {
    setCredentials(null);
    setDashboardData(null);
    setCode('');
    setGenerateCodesState({ loading: false, message: null, error: null });
    setEditDayData(null);
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
