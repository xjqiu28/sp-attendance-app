import { useEffect, useState } from 'react';
import { fetchNames, type NameLists } from '../api/attendanceApi.ts';

const CACHE_KEY = 'sp-attendance-names-cache';

// Cached as { names, directorNames }. An older cache (a plain array of
// names, from before directorNames existed) is treated as no cache.
function readCachedNames(): NameLists | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return cached && Array.isArray(cached.names) && Array.isArray(cached.directorNames) ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedNames(fetched: NameLists) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
  } catch {
    // Storage unavailable (private browsing, quota, etc) — safe to ignore,
    // the app just falls back to fetching every time.
  }
}

// Names rarely change day to day, so a cached copy from localStorage is
// shown immediately (no "Loading names..." on repeat visits) while a
// fresh copy is fetched in the background and silently swapped in.
// refreshNames re-fetches on demand — e.g. after a director adds
// someone, so they show up in the dropdowns without a page reload.
export default function useNames() {
  const [names, setNames] = useState(() => readCachedNames()?.names || []);
  const [directorNames, setDirectorNames] = useState(() => readCachedNames()?.directorNames || []);
  const [loading, setLoading] = useState(() => readCachedNames() === null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchNames()
      .then((fetched) => {
        if (isMounted) {
          setNames(fetched.names);
          setDirectorNames(fetched.directorNames);
          writeCachedNames(fetched);
        }
      })
      .catch(() => {
        if (isMounted && names.length === 0) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshNames() {
    try {
      const fetched = await fetchNames();
      setNames(fetched.names);
      setDirectorNames(fetched.directorNames);
      writeCachedNames(fetched);
    } catch {
      // Keep showing the current list — it'll catch up on the next load.
    }
  }

  return { names, directorNames, loading, failed, refreshNames };
}
