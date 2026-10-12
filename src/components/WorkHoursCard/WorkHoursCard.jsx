import { useState } from 'react';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import '../AttendanceCard/AttendanceCard.scss'; // .attendance-card base look
import '../LoginCard/LoginCard.scss'; // label/input/button base styles
import '../EditEntryCard/EditEntryCard.scss'; // .edit-entry-field/-actions/-clear, shared look
import './WorkHoursCard.scss';

// One person's editable Work Hours start/end. Same local-draft pattern
// as EditEntryCard — nothing is sent until Save is pressed.
export default function WorkHoursCard({ entry, onSave, viewMode }) {
  const [start, setStart] = useState(entry.startTime);
  const [end, setEnd] = useState(entry.endTime);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { text, type: 'success' | 'error' }

  const fieldId = `work-hours-${entry.name.replace(/\s+/g, '-').toLowerCase()}`;

  // A Work Hours cell typed by hand that parseWorkHours (Utils.gs)
  // can't read comes back with blank start/end — show the raw text so
  // the director knows saving will replace it.
  const unrecognized = entry.workHours && !entry.startTime;

  async function save(startValue, endValue, savingText, doneText) {
    setSaving(true);
    setStatus({ text: savingText, type: '' });

    const result = await onSave(entry.name, startValue, endValue);

    if (result.success) {
      setStart(startValue);
      setEnd(endValue);
      setStatus({ text: doneText, type: 'success' });
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

      {unrecognized && (
        <p className="work-hours-unrecognized">
          Current value "{entry.workHours}" isn't in a recognized format. Saving replaces it.
        </p>
      )}

      <div className="attendance-card-fields">
        <div className="edit-entry-field">
          <label htmlFor={`${fieldId}-start`}>Start Time</label>
          <input
            type="time"
            id={`${fieldId}-start`}
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>

        <div className="edit-entry-field">
          <label htmlFor={`${fieldId}-end`}>End Time</label>
          <input type="time" id={`${fieldId}-end`} value={end} onChange={(event) => setEnd(event.target.value)} />
        </div>
      </div>

      <div className="edit-entry-actions">
        <button type="button" onClick={() => save(start, end, 'Saving...', 'Saved.')} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button
          type="button"
          className="edit-entry-clear"
          onClick={() => save('', '', 'Clearing...', 'Cleared.')}
          disabled={saving || (!start && !end && !entry.workHours)}
        >
          Clear
        </button>
      </div>

      <StatusMessage text={status?.text} type={status?.type} />
    </div>
  );
}
