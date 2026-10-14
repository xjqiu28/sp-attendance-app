import { useState } from 'react';

// searchable adds a search box above the dropdown that narrows its
// options as you type (any part of the name, ignoring case) — and
// picks the name outright once only one matches.
export default function NameAndCodeFields({
  names,
  namesLoading,
  namesLoadFailed,
  searchable,
  selectedName,
  onNameChange,
  code,
  onCodeChange,
}) {
  const [search, setSearch] = useState('');

  const namesUnavailable = !namesLoading && names.length === 0;
  const trimmedSearch = search.trim().toLowerCase();
  const visibleNames = trimmedSearch ? names.filter((name) => name.toLowerCase().includes(trimmedSearch)) : names;

  function handleSearchChange(value) {
    setSearch(value);

    const query = value.trim().toLowerCase();
    const matches = query ? names.filter((name) => name.toLowerCase().includes(query)) : names;

    if (query && matches.length === 1) {
      onNameChange(matches[0]);
    } else if (selectedName && !matches.includes(selectedName)) {
      onNameChange('');
    }
  }

  return (
    <>
      {searchable && (
        <>
          <label htmlFor="name-search">Search Name</label>
          <input
            type="search"
            id="name-search"
            placeholder="Start typing your name"
            autoComplete="off"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            disabled={namesLoading || namesUnavailable}
          />
        </>
      )}

      <label htmlFor="name">Full Name</label>
      <select
        id="name"
        value={selectedName}
        onChange={(event) => onNameChange(event.target.value)}
        disabled={namesLoading || namesUnavailable}
      >
        {namesLoading && <option value="">Loading names...</option>}

        {namesUnavailable && (
          <option value="">{namesLoadFailed ? "Couldn't load names" : 'No names found'}</option>
        )}

        {!namesLoading && !namesUnavailable && (
          <>
            <option value="">
              {visibleNames.length === 0 ? `No names match "${search.trim()}"` : 'Select your name'}
            </option>
            {visibleNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </>
        )}
      </select>

      <label htmlFor="code">Personal Code</label>
      <input
        type="text"
        id="code"
        placeholder="e.g. A12345"
        autoComplete="off"
        value={code}
        onChange={(event) => onCodeChange(event.target.value)}
      />
    </>
  );
}
