import { useState, type FormEvent } from 'react';
import {
  getDirectorView,
  generatePersonalCodes,
  generateReport,
  getEditDayView,
  updateAttendanceEntry,
  getWorkHoursView,
  updateWorkHours,
  addStaff,
  approveWeek,
  unapproveWeek,
  getApplicationsView,
  updateApplication,
  syncScheduledTimes,
  sendOfferLetters,
  checkOfferReplies,
  type Application,
  type ApplicationUpdates,
  type DailyView,
  type EditDayView,
  type Failure,
  type StaffInput,
  type WeeklyView,
  type WorkHoursView,
} from '../api/attendanceApi.ts';
import { toBackendDate, toBackendDateTime, todayDateInputValue } from '../utils/dateTimeFormat.ts';

export type DashboardMode = 'daily' | 'weekly' | 'edit' | 'workHours' | 'applications';
export type ViewMode = 'card' | 'list';

export interface Credentials {
  name: string;
  code: string;
}

// A message under a form or button: type is '' (neutral), 'success' or
// 'error' — the StatusMessage classes.
export interface StatusText {
  text: string;
  type: string;
}

// A director-triggered toolbar action's progress (Generate Codes,
// Sync, Send Offer Letters, Check Replies).
export interface ActionState {
  loading: boolean;
  message: string | null;
  error: string | null;
}

// What each view's fetch stores once it succeeds.
type Loaded<T> = { success: true } & T;

interface LoadOptions {
  force?: boolean;
}

const IDLE_ACTION: ActionState = { loading: false, message: null, error: null };

// Returned by the save/approve/update handlers if they're somehow
// called after logging out — the screens that call them only exist
// while logged in.
const NOT_LOGGED_IN: Failure = { success: false, error: 'Please log in again.' };

function networkErrorText(err: unknown) {
  return err instanceof Error && err.name === 'AbortError'
    ? 'This is taking too long. Please try again.'
    : 'Network error — please try again.';
}

const VIEW_MODE_KEY = 'sp-attendance-director-view-mode';

function readStoredViewMode(): ViewMode {
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
// editDayDataByDate, workHoursData, applicationsData) so switching between tabs you've
// already visited shows the cached result instantly instead of
// re-fetching every time — a mode is only re-fetched when it has never
// been loaded, when a param changes to a value not yet cached (a new
// week or date), or when handleRefresh explicitly forces it. Logging
// out clears every cache since the next login could be a different
// director/dataset.
// onRosterChange is called after a director adds someone, so App can
// refresh its name list.
export default function useDirectorDashboard({ onRosterChange }: { onRosterChange?: () => void } = {}) {
  const [selectedName, setSelectedName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusText | null>(null);

  // Once logged in, the validated credentials are kept here so the
  // Daily/Weekly toggle and week picker can re-fetch without asking again.
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [mode, setMode] = useState<DashboardMode>('daily');
  // Applies across all modes — how densely entries are shown, not
  // which entries. Persisted since it's a display preference, not
  // per-session state.
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  const [dailyData, setDailyData] = useState<Loaded<DailyView> | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  // Keyed by weekNumber so revisiting a previously-viewed week (via the
  // Weekly tab or the week picker) never re-fetches it.
  const [weeklyDataByWeek, setWeeklyDataByWeek] = useState<Record<number, Loaded<WeeklyView>>>({});
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null);

  const weeklyData = currentWeekNumber !== null ? weeklyDataByWeek[currentWeekNumber] ?? null : null;
  const dashboardLoading = mode === 'weekly' ? weeklyLoading : dailyLoading;
  const dashboardError = mode === 'weekly' ? weeklyError : dailyError;

  const [generateCodesState, setGenerateCodesState] = useState<ActionState>(IDLE_ACTION);

  // 'Edit Day' mode's own date + data, kept separate from the
  // daily/weekly data above since it's fetched independently. Keyed by
  // backend date string so switching back to an already-viewed date
  // doesn't re-fetch it.
  const [editDate, setEditDate] = useState(todayDateInputValue()); // <input type="date"> value
  const [editDayDataByDate, setEditDayDataByDate] = useState<Record<string, Loaded<EditDayView>>>({});
  const [editDayLoading, setEditDayLoading] = useState(false);
  const [editDayError, setEditDayError] = useState<string | null>(null);

  const editDayData = editDayDataByDate[toBackendDate(editDate)] ?? null;

  // 'Work Hours' mode's own data, independent of the others.
  const [workHoursData, setWorkHoursData] = useState<Loaded<WorkHoursView> | null>(null);
  const [workHoursLoading, setWorkHoursLoading] = useState(false);
  const [workHoursError, setWorkHoursError] = useState<string | null>(null);

  // 'Applications' mode's own data, independent of the others.
  const [applicationsData, setApplicationsData] = useState<Loaded<{ tabName: string; applications: Application[] }> | null>(
    null
  );
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [syncScheduleState, setSyncScheduleState] = useState<ActionState>(IDLE_ACTION);
  const [offerLettersState, setOfferLettersState] = useState<ActionState>(IDLE_ACTION);
  const [offerRepliesState, setOfferRepliesState] = useState<ActionState>(IDLE_ACTION);

  async function loadDaily(activeCredentials: Credentials, options: LoadOptions = {}) {
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
  async function loadWeekly(activeCredentials: Credentials, weekNumber: number | undefined, options: LoadOptions = {}) {
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

  async function handleSubmit(event: FormEvent) {
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

  function handleModeChange(newMode: DashboardMode) {
    if (!credentials) {
      return;
    }

    setMode(newMode);

    if (newMode === 'edit') {
      loadEditDay(credentials, editDate);
    } else if (newMode === 'workHours') {
      loadWorkHours(credentials);
    } else if (newMode === 'applications') {
      loadApplications(credentials);
    } else if (newMode === 'daily') {
      loadDaily(credentials);
    } else if (newMode === 'weekly') {
      loadWeekly(credentials, currentWeekNumber ?? undefined);
    }
  }

  function handleViewModeChange(newViewMode: ViewMode) {
    setViewMode(newViewMode);

    try {
      localStorage.setItem(VIEW_MODE_KEY, newViewMode);
    } catch {
      // Storage unavailable (private browsing, quota, etc) — the
      // preference just won't survive a reload, which is fine.
    }
  }

  function handleWeekChange(weekNumber: number) {
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
    } else if (mode === 'workHours') {
      loadWorkHours(credentials, { force: true });
    } else if (mode === 'applications') {
      loadApplications(credentials, { force: true });
    }
  }

  async function loadEditDay(activeCredentials: Credentials, dateInputValue: string, options: LoadOptions = {}) {
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

  function handleEditDateChange(newDateInputValue: string) {
    setEditDate(newDateInputValue);

    if (credentials) {
      loadEditDay(credentials, newDateInputValue);
    }
  }

  // Always resolves (never rejects) with { success, message } or
  // { success: false, error } — including on a network failure — so
  // the calling card can show its own inline feedback without needing
  // its own try/catch.
  async function handleSaveEntry(targetName: string, signInInputValue: string, signOutInputValue: string) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

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
      return { success: false as const, error: networkErrorText(err) };
    }

    if (result.success) {
      setEditDayDataByDate((previous) => {
        const day = previous[backendDate];

        if (!day) {
          return previous;
        }

        return {
          ...previous,
          [backendDate]: {
            ...day,
            entries: day.entries.map((entry) =>
              entry.name === targetName
                ? { ...entry, signInTime: signInTime || null, signOutTime: signOutTime || null, sessions: null }
                : entry
            ),
          },
        };
      });

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
  async function handleApproveWeek(targetName: string, weekStart: string) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

    let result;

    try {
      result = await approveWeek(credentials.name, credentials.code, targetName, weekStart);
    } catch (err) {
      return { success: false as const, error: networkErrorText(err) };
    }

    if (result.success) {
      const approval = { approvedBy: result.approvedBy, approvedAt: result.approvedAt };
      updateCurrentWeekEntry(targetName, (entry) => ({ ...entry, approval }));
    }

    return result;
  }

  // Applies change to one person's entry in the currently shown week's
  // cached data, if that week is loaded.
  function updateCurrentWeekEntry(
    targetName: string,
    change: (entry: WeeklyView['entries'][number]) => WeeklyView['entries'][number]
  ) {
    if (currentWeekNumber === null) {
      return;
    }

    setWeeklyDataByWeek((previous) => {
      const week = previous[currentWeekNumber];

      if (!week) {
        return previous;
      }

      return {
        ...previous,
        [currentWeekNumber]: {
          ...week,
          entries: week.entries.map((entry) => (entry.name === targetName ? change(entry) : entry)),
        },
      };
    });
  }

  // Same always-resolves pattern as handleApproveWeek.
  async function handleUnapproveWeek(targetName: string, weekStart: string) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

    let result;

    try {
      result = await unapproveWeek(credentials.name, credentials.code, targetName, weekStart);
    } catch (err) {
      return { success: false as const, error: networkErrorText(err) };
    }

    if (result.success) {
      updateCurrentWeekEntry(targetName, (entry) => ({ ...entry, approval: null }));
    }

    return result;
  }

  async function loadWorkHours(activeCredentials: Credentials, options: LoadOptions = {}) {
    if (!options.force && workHoursData) {
      return;
    }

    setWorkHoursLoading(true);
    setWorkHoursError(null);

    try {
      const result = await getWorkHoursView(activeCredentials.name, activeCredentials.code);

      if (result.success) {
        setWorkHoursData(result);
      } else {
        setWorkHoursError(result.error);
      }
    } catch (err) {
      setWorkHoursError(networkErrorText(err));
    } finally {
      setWorkHoursLoading(false);
    }
  }

  // Same always-resolves pattern as handleSaveEntry. startTime/endTime
  // are native <input type="time"> values ("HH:MM", or '' for both to
  // clear).
  async function handleSaveWorkHours(targetName: string, startTime: string, endTime: string) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

    let result;

    try {
      result = await updateWorkHours(credentials.name, credentials.code, targetName, startTime, endTime);
    } catch (err) {
      return { success: false as const, error: networkErrorText(err) };
    }

    if (result.success) {
      const { workHours } = result;
      setWorkHoursData((previous) =>
        previous
          ? {
              ...previous,
              entries: previous.entries.map((entry) =>
                entry.name === targetName ? { ...entry, workHours, startTime, endTime } : entry
              ),
            }
          : previous
      );

      // Work Hours drive Daily/Weekly's late flags and notes — drop
      // those caches so they re-fetch fresh too.
      setDailyData(null);
      setWeeklyDataByWeek({});
    }

    return result;
  }

  // Same always-resolves pattern as handleSaveEntry. staff is the Add
  // Staff form's fields (see addStaff, attendanceApi.ts).
  async function handleAddStaff(staff: StaffInput) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

    let result;

    try {
      result = await addStaff(credentials.name, credentials.code, staff);
    } catch (err) {
      return { success: false as const, error: networkErrorText(err) };
    }

    if (result.success) {
      const { entry: newEntry } = result;
      setWorkHoursData((previous) =>
        previous
          ? {
              ...previous,
              entries: [...previous.entries, newEntry].sort((a, b) => a.name.localeCompare(b.name)),
            }
          : previous
      );

      // A new name changes Daily's roster/absent counts and Weekly's rows.
      setDailyData(null);
      setWeeklyDataByWeek({});

      if (onRosterChange) {
        onRosterChange();
      }
    }

    return result;
  }

  async function loadApplications(activeCredentials: Credentials, options: LoadOptions = {}) {
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
  async function handleUpdateApplication(targetEmail: string, updates: ApplicationUpdates) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

    let result;

    try {
      result = await updateApplication(credentials.name, credentials.code, targetEmail, updates);
    } catch (err) {
      return { success: false as const, error: networkErrorText(err) };
    }

    if (result.success) {
      setApplicationsData((previous) =>
        previous
          ? {
              ...previous,
              applications: previous.applications.map((application) =>
                application.email === targetEmail ? { ...application, ...updates } : application
              ),
            }
          : previous
      );
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

  // Returns the backend result so GenerateReportPanel can show its own
  // status/link, the same way handleSaveEntry does for EditEntryCard.
  async function handleGenerateReport(weekStart: string, email: string) {
    if (!credentials) {
      return NOT_LOGGED_IN;
    }

    try {
      return await generateReport(credentials.name, credentials.code, weekStart, email);
    } catch (err) {
      return { success: false as const, error: networkErrorText(err) };
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
    setWorkHoursData(null);
    setWorkHoursError(null);
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
    dailyData,
    weeklyData,
    dashboardLoading,
    dashboardError,
    generateCodesState,
    editDate,
    editDayData,
    editDayLoading,
    editDayError,
    workHoursData,
    workHoursLoading,
    workHoursError,
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
    handleGenerateReport,
    handleRefresh,
    handleLogOut,
    handleGenerateCodes,
    handleEditDateChange,
    handleSaveEntry,
    handleSaveWorkHours,
    handleAddStaff,
    handleApproveWeek,
    handleUnapproveWeek,
    handleUpdateApplication,
    handleSyncScheduledTimes,
    handleSendOfferLetters,
    handleCheckOfferReplies,
  };
}
