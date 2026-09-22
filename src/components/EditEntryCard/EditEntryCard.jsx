import { useState } from 'react';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import { formatTimeOnly, toTimeInputValue } from '../../utils/dateTimeFormat.js';
import '../AttendanceCard/AttendanceCard.scss'; // .attendance-card base look
import '../LoginCard/LoginCard.scss'; // label/input/button base styles
import './EditEntryCard.scss';

// One person's editable sign-in/sign-out for whichever date EditDayView
// currently has selected. Local draft state only — nothing is sent
// until Save is pressed, so switching dates elsewhere never loses or
// clobbers an in-progress edit.
export default function EditEntryCard({ entry, onSave, viewMode }) {
  const [signIn, setSignIn] = useState(toTimeInputValue(entry.signInTime));
  const [signOut, setSignOut] = useState(toTimeInputValue(entry.signOutTime));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { text, type: 'success' | 'error' }

  const fieldId = entry.name.replace(/\s+/g, '-').toLowerCase();

  async function handleSave() {
    setSaving(true);
    setStatus({ text: 'Saving...', type: '' });

    const result = await onSave(entry.name, signIn, signOut);

    if (result.success) {
      setStatus({ text: 'Saved.', type: 'success' });
    } else {
      setStatus({ text: result.error, type: 'error' });
    }

    setSaving(false);
  }

  // Both times blank clears the entry (see updateAttendanceEntry,
  // EditDay.gs) — this sets the fields and saves in one click instead
  // of making a director clear each time input by hand first.
  async function handleClear() {
    setSaving(true);
    setStatus({ text: 'Clearing...', type: '' });

    const result = await onSave(entry.name, '', '');

    if (result.success) {
      setSignIn('');
      setSignOut('');
      setStatus({ text: 'Cleared.', type: 'success' });
    } else {
      setStatus({ text: result.error, type: 'error' });
    }

    setSaving(false);
  }

  return (
    <div className={viewMode === 'list' ? 'attendance-row' : 'attendance-card'}>
      <div className="attendance-card-header">
        <span className="attendance-card-name">{entry.name}</span>
      </div>

      {entry.sessions && (
        <p className="edit-entry-sessions">
          Stepped out and came back:{' '}
          {entry.sessions
            .map((session) => `${formatTimeOnly(session.signInTime)} – ${formatTimeOnly(session.signOutTime) || '—'}`)
            .join(', ')}
          . Saving replaces these with the one sign-in/sign-out below.
        </p>
      )}

      <div className="attendance-card-fields">
        <div className="edit-entry-field">
          <label htmlFor={`${fieldId}-sign-in`}>Sign In</label>
          <input
            type="time"
            id={`${fieldId}-sign-in`}
            value={signIn}
            onChange={(event) => setSignIn(event.target.value)}
          />
        </div>

        <div className="edit-entry-field">
          <label htmlFor={`${fieldId}-sign-out`}>Sign Out</label>
          <input
            type="time"
            id={`${fieldId}-sign-out`}
            value={signOut}
            onChange={(event) => setSignOut(event.target.value)}
          />
        </div>
      </div>

      <div className="edit-entry-actions">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button
          type="button"
          className="edit-entry-clear"
          onClick={handleClear}
          disabled={saving || (!signIn && !signOut)}
        >
          Clear
        </button>
      </div>

      <StatusMessage text={status?.text} type={status?.type} />
    </div>
  );
}
