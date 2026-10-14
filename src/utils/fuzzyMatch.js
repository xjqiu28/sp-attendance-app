// Typo-tolerant name search for the attendance name picker
// (NameCombobox). Matches what's typed against ANY part of a name, so
// "jde" still finds "Jade Pang" and "lee ivan"-style partial typing
// works per word — and ranks closer matches first.

// How many typos a query of this length may contain. Very short
// queries must match exactly, or almost every name would match.
function allowedTypos(queryLength) {
  if (queryLength <= 2) return 0;
  if (queryLength <= 5) return 1;
  return 2;
}

// Fewest edits (insert, delete, substitute, or swap two neighbouring
// letters) to turn query into some stretch of text — the stretch may
// start and end anywhere, so typing only part of a name costs nothing
// extra. Optimal string alignment distance with a free start/end in
// text (Sellers' algorithm).
// With anchored, the stretch must start at text's first letter
// instead (used to tell whether a match lines up with a word's start).
function partialEditDistance(query, text, anchored = false) {
  const m = query.length;
  const n = text.length;
  // row[j]: best cost of matching query[0..i) ending at text[j].
  let prevPrev = null;
  // Unanchored, an empty query matches anywhere for free; anchored,
  // skipping text's first j letters costs j.
  let prev = Array.from({ length: n + 1 }, (_, j) => (anchored ? j : 0));

  for (let i = 1; i <= m; i++) {
    const row = new Array(n + 1);
    row[0] = i;

    for (let j = 1; j <= n; j++) {
      const cost = query[i - 1] === text[j - 1] ? 0 : 1;
      let best = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);

      if (
        prevPrev &&
        j > 1 &&
        query[i - 1] === text[j - 2] &&
        query[i - 2] === text[j - 1]
      ) {
        best = Math.min(best, prevPrev[j - 2] + 1);
      }

      row[j] = best;
    }

    prevPrev = prev;
    prev = row;
  }

  return Math.min(...prev);
}

// Fewest typos for query to match the start of one of name's words.
function wordStartDistance(query, lowerName) {
  let best = Infinity;

  lowerName.split(' ').forEach((_, index, words) => {
    best = Math.min(best, partialEditDistance(query, words.slice(index).join(' '), true));
  });

  return best;
}

// Typos for a multi-word query matched one word at a time, in any order
// ("wong wendy" for "Wendy Wong") — or Infinity if any one word is
// further off than its own length allows.
function perWordDistance(queryWords, lowerName) {
  let total = 0;

  for (const word of queryWords) {
    const typos = wordStartDistance(word, lowerName);

    if (typos > allowedTypos(word.length)) {
      return Infinity;
    }

    total += typos;
  }

  return total;
}

// Returns the names matching query, best match first: exact substring
// matches (earliest position first), then typo matches (fewest typos
// first, then those lining up with the start of a word),
// alphabetical within ties. Blank query returns names as-is.
export function fuzzyFilterNames(names, query) {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');

  if (!normalizedQuery) {
    return names;
  }

  const maxTypos = allowedTypos(normalizedQuery.replace(/ /g, '').length);
  const queryWords = normalizedQuery.split(' ');
  const scored = [];

  names.forEach((name) => {
    const lowerName = name.toLowerCase();
    const position = lowerName.indexOf(normalizedQuery);

    if (position !== -1) {
      scored.push({ name, typos: 0, wordStart: true, position });
      return;
    }

    let typos = partialEditDistance(normalizedQuery, lowerName);

    if (queryWords.length > 1) {
      typos = Math.min(typos, perWordDistance(queryWords, lowerName));
    }

    if (typos <= maxTypos) {
      const wordStart = wordStartDistance(normalizedQuery, lowerName) <= typos;
      scored.push({ name, typos, wordStart, position: Infinity });
    }
  });

  scored.sort(
    (a, b) =>
      a.typos - b.typos ||
      b.wordStart - a.wordStart ||
      a.position - b.position ||
      a.name.localeCompare(b.name)
  );

  return scored.map((entry) => entry.name);
}
