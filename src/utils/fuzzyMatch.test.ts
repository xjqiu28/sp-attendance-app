import { describe, expect, it } from 'vitest';
import { fuzzyFilterNames } from './fuzzyMatch.ts';

const NAMES = ['Alex Kim', 'Jane Doe', 'John Smith', 'Maria Garcia', 'Sam Lee', 'Tom Baker'];

describe('fuzzyFilterNames', () => {
  it('returns the names unchanged for a blank query', () => {
    expect(fuzzyFilterNames(NAMES, '')).toBe(NAMES);
    expect(fuzzyFilterNames(NAMES, '   ')).toBe(NAMES);
  });

  it('matches any part of a name, ignoring case', () => {
    expect(fuzzyFilterNames(NAMES, 'jane')).toEqual(['Jane Doe']);
    expect(fuzzyFilterNames(NAMES, 'JANE')).toEqual(['Jane Doe']);
    expect(fuzzyFilterNames(NAMES, 'smith')).toEqual(['John Smith']);
  });

  it('ignores extra spaces in the query', () => {
    expect(fuzzyFilterNames(NAMES, '  jane   doe ')).toEqual(['Jane Doe']);
  });

  it('orders exact matches by where the match starts', () => {
    expect(fuzzyFilterNames(NAMES, 'j')).toEqual(['Jane Doe', 'John Smith']);
  });

  it('allows no typos for queries of one or two letters', () => {
    expect(fuzzyFilterNames(NAMES, 'am')).toEqual(['Sam Lee']);
    expect(fuzzyFilterNames(NAMES, 'zz')).toEqual([]);
  });

  it('finds a name with one wrong letter', () => {
    expect(fuzzyFilterNames(NAMES, 'mary')).toEqual(['Maria Garcia']);
    expect(fuzzyFilterNames(NAMES, 'maria garsia')).toEqual(['Maria Garcia']);
  });

  it('counts two swapped neighbouring letters as one typo', () => {
    expect(fuzzyFilterNames(NAMES, 'jnae')).toEqual(['Jane Doe']);
    expect(fuzzyFilterNames(NAMES, 'smiht')).toEqual(['John Smith']);
  });

  it('finds a name with a missing letter', () => {
    expect(fuzzyFilterNames(NAMES, 'jon smith')).toEqual(['John Smith']);
    expect(fuzzyFilterNames(NAMES, 'tom bakr')).toEqual(['Tom Baker']);
  });

  it('allows two typos in a longer query', () => {
    expect(fuzzyFilterNames(NAMES, 'marai gracia')).toEqual(['Maria Garcia']);
  });

  it('matches the words of a name in any order', () => {
    expect(fuzzyFilterNames(NAMES, 'smith john')).toEqual(['John Smith']);
    expect(fuzzyFilterNames(NAMES, 'doe jane')).toEqual(['Jane Doe']);
  });

  it('ranks exact matches before typo matches', () => {
    expect(fuzzyFilterNames(NAMES, 'lee')).toEqual(['Sam Lee', 'Alex Kim']);
  });

  it('ranks typo matches that line up with the start of a word first', () => {
    // Both are one typo away, but "lea" lines up with the start of
    // "Lee" and only with the middle of "Alex".
    expect(fuzzyFilterNames(NAMES, 'lea')).toEqual(['Sam Lee', 'Alex Kim']);
  });

  it('returns nothing when no name is close enough', () => {
    expect(fuzzyFilterNames(NAMES, 'zzz')).toEqual([]);
  });

  it('does not change the array it is given', () => {
    const names = [...NAMES];
    fuzzyFilterNames(names, 'lea');
    expect(names).toEqual(NAMES);
  });
});
