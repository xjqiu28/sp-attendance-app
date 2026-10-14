import { useState, type KeyboardEvent } from 'react';
import { fuzzyFilterNames } from '../../utils/fuzzyMatch.ts';
import './NameCombobox.scss';

// A name dropdown you can type into: focusing it opens the full list,
// typing narrows it (any part of the name, ignoring case, tolerating a
// typo or two — see fuzzyFilterNames), and clicking
// or Enter picks one. A native <select> can't be searched inside, so
// this replaces it on the attendance form. selectedName is only ever a
// real roster name or '' — free text that doesn't match exactly never
// counts as a selection.
interface NameComboboxProps {
  id: string;
  names: string[];
  disabled?: boolean;
  placeholder?: string;
  selectedName: string;
  onNameChange: (name: string) => void;
}

export default function NameCombobox({
  id,
  names,
  disabled,
  placeholder,
  selectedName,
  onNameChange,
}: NameComboboxProps) {
  const [text, setText] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // Keep the box in sync if the parent clears/changes the selection
  // on its own — changes this box made itself are recorded in
  // lastSelected first (see report), so they never overwrite what's
  // being typed.
  const [lastSelected, setLastSelected] = useState(selectedName);
  if (selectedName !== lastSelected) {
    setLastSelected(selectedName);
    setText(selectedName);
  }

  // Showing the already-picked name shouldn't filter the list down to
  // just that name — reopening it should offer everyone again.
  const matches = text !== selectedName ? fuzzyFilterNames(names, text) : names;

  function report(name: string) {
    setLastSelected(name);
    onNameChange(name);
  }

  function choose(name: string) {
    setText(name);
    setOpen(false);
    report(name);
  }

  function handleTextChange(value: string) {
    setText(value);
    setOpen(true);
    setHighlighted(0);

    const exact = names.find((name) => name.toLowerCase() === value.trim().toLowerCase());
    report(exact || '');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && matches[highlighted]) {
      // Pick the highlighted name instead of submitting the form.
      event.preventDefault();
      choose(matches[highlighted]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const listId = `${id}-options`;

  return (
    <div className="name-combobox">
      <input
        type="text"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[highlighted] ? `${listId}-${highlighted}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(event) => handleTextChange(event.target.value)}
        onFocus={() => {
          setOpen(true);
          setHighlighted(0);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />

      {open && !disabled && (
        <ul className="name-combobox-options" id={listId} role="listbox">
          {matches.length === 0 ? (
            <li className="name-combobox-empty">No names match "{text.trim()}"</li>
          ) : (
            matches.map((name, index) => (
              <li
                key={name}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={name === selectedName}
                className={index === highlighted ? 'highlighted' : undefined}
                // mousedown (not click) fires before the input's blur
                // closes the list, so the pick isn't lost.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(name);
                }}
                onMouseEnter={() => setHighlighted(index)}
              >
                {name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
