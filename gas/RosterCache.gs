/**
 * ===================================================================
 * ROSTER CACHE
 * ===================================================================
 * Validating a name + personal code (attendance sign-in, director
 * login, code generation) only needs the Name, Personal Code, and
 * Admin columns — but without caching, every request re-reads those
 * columns from scratch, and processAttendanceSubmission's old bulk
 * read pulled in every date column too, getting slower as the sheet
 * grows. Also carries each person's own scheduled sign-in/out (see
 * SCHEDULED_SIGN_IN_HEADER, Config.gs), since processAttendanceSubmission
 * already looks a person up here and would otherwise need a second,
 * separate read to get it.
 *
 * CacheService.getScriptCache() persists data server-side, shared by
 * every execution of this script — unlike a normal variable, which
 * resets between calls since each request runs in its own isolated
 * environment. We use a short 5-minute TTL: long enough to skip
 * repeated reads for the same roster, short enough that a name added
 * or edited directly on the sheet shows up again on its own shortly
 * after. Anything that writes to Name/Personal Code/Admin/the
 * scheduled columns should also call invalidateRosterCache() so the
 * change is visible immediately instead of waiting out the TTL.
 *
 * Cache values must be strings, so the roster is stored as a JSON
 * string and parsed back out on read.
 */

const ROSTER_CACHE_KEY = 'roster_v2';
const ROSTER_CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Returns { byLowerName: { [lowercasedName]: { name, row, personalCode,
 * isAdmin, signInSchedule, signOutSchedule } } }, where each schedule
 * is { hour, minute } or null. signInSchedule comes from Work Hours
 * when set, else Scheduled Sign In (see getSignInSchedule, Utils.gs). Rebuilt from the sheet on a cache miss,
 * reused as-is on a cache hit.
 */
function getRoster(sheet, columnIndexes) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(ROSTER_CACHE_KEY);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      // Corrupt cache entry — fall through and rebuild below.
    }
  }

  const roster = buildRosterFromSheet(sheet, columnIndexes);
  cache.put(ROSTER_CACHE_KEY, JSON.stringify(roster), ROSTER_CACHE_TTL_SECONDS);
  return roster;
}

function buildRosterFromSheet(sheet, columnIndexes) {
  const nameColumnIndex = columnIndexes.Name;
  const personalCodeColumnIndex = columnIndexes['Personal Code'];
  const adminColumnIndex = columnIndexes.Admin;
  const scheduledSignInColumnIndex = columnIndexes[SCHEDULED_SIGN_IN_HEADER];
  const scheduledSignOutColumnIndex = columnIndexes[SCHEDULED_SIGN_OUT_HEADER];
  const workHoursColumnIndex = columnIndexes[WORK_HOURS_HEADER];

  const byLowerName = {};

  if (nameColumnIndex === undefined) {
    return { byLowerName: byLowerName };
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return { byLowerName: byLowerName };
  }

  const rowCount = lastRow - 1;
  const names = sheet.getRange(2, nameColumnIndex + 1, rowCount, 1).getValues();
  const codes =
    personalCodeColumnIndex !== undefined
      ? sheet.getRange(2, personalCodeColumnIndex + 1, rowCount, 1).getValues()
      : null;
  const admins =
    adminColumnIndex !== undefined
      ? sheet.getRange(2, adminColumnIndex + 1, rowCount, 1).getValues()
      : null;
  const scheduledSignIns =
    scheduledSignInColumnIndex !== undefined
      ? sheet.getRange(2, scheduledSignInColumnIndex + 1, rowCount, 1).getValues()
      : null;
  const scheduledSignOuts =
    scheduledSignOutColumnIndex !== undefined
      ? sheet.getRange(2, scheduledSignOutColumnIndex + 1, rowCount, 1).getValues()
      : null;
  const workHoursValues =
    workHoursColumnIndex !== undefined
      ? sheet.getRange(2, workHoursColumnIndex + 1, rowCount, 1).getValues()
      : null;

  for (let i = 0; i < names.length; i++) {
    const name = String(names[i][0]).trim();

    if (!name) {
      continue;
    }

    const adminValue = admins ? String(admins[i][0]).trim().toLowerCase() : '';

    byLowerName[name.toLowerCase()] = {
      name: name,
      row: i + 2,
      personalCode: codes ? String(codes[i][0]).trim() : '',
      isAdmin: ['yes', 'true', 'y', '1'].indexOf(adminValue) !== -1,
      signInSchedule: getSignInSchedule(
        workHoursValues ? workHoursValues[i][0] : '',
        scheduledSignIns ? scheduledSignIns[i][0] : ''
      ),
      signOutSchedule: scheduledSignOuts ? parseTimeOfDay(scheduledSignOuts[i][0]) : null,
    };
  }

  return { byLowerName: byLowerName };
}

/**
 * Clears the roster cache so the next lookup rebuilds it from the
 * sheet right away. Call this any time code writes to the Name,
 * Personal Code, or Admin columns.
 */
function invalidateRosterCache() {
  CacheService.getScriptCache().remove(ROSTER_CACHE_KEY);
}
