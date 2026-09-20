import { useState } from 'react';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import '../AttendanceCard/AttendanceCard.scss'; // .attendance-card base look
import '../LoginCard/LoginCard.scss'; // label/input/button base styles
import './ApplicationCard.scss';

const ACCEPT_DECLINE_BADGE_CLASS = {
  Accept: 'status-complete',
  Decline: 'status-late',
};

export default function ApplicationCard({ entry, onSave, viewMode }) {
  const [fields, setFields] = useState({
    missingDocuments: entry.missingDocuments,
    acceptDecline: entry.acceptDecline,
    ss: entry.ss,
    w4Forms: entry.w4Forms,
    resignationEmailSent: entry.resignationEmailSent,
    resignationLetters: entry.resignationLetters,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { text, type }

  const fieldId = `${entry.firstName}-${entry.lastName}`.replace(/\s+/g, '-').toLowerCase();

  function updateField(field, value) {
    setFields((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setStatus({ text: 'Saving...', type: '' });

    const result = await onSave(entry.email, fields);

    setStatus(result.success ? { text: 'Saved.', type: 'success' } : { text: result.error, type: 'error' });
    setSaving(false);
  }

  return (
    <div className={viewMode === 'list' ? 'attendance-row application-card' : 'attendance-card application-card'}>
      <div className="attendance-card-header">
        <span className="attendance-card-name">
          {entry.firstName} {entry.lastName}
        </span>
        <div className="attendance-card-badges">
          {entry.sent && <span className="badge status-signed-in">Sent</span>}
          {entry.acceptDecline && (
            <span className={`badge ${ACCEPT_DECLINE_BADGE_CLASS[entry.acceptDecline] || 'status-not-signed-in'}`}>
              {entry.acceptDecline}
            </span>
          )}
        </div>
      </div>

      <div className="attendance-card-fields">
        <div className="attendance-card-row">
          <span className="attendance-card-label">Title</span>
          <span>{entry.title || '—'}</span>
        </div>
        <div className="attendance-card-row">
          <span className="attendance-card-label">Date</span>
          <span>{entry.dateInformation || '—'}</span>
        </div>
        <div className="attendance-card-row">
          <span className="attendance-card-label">Time</span>
          <span>{entry.time || '—'}</span>
        </div>
        <div className="attendance-card-row">
          <span className="attendance-card-label">Rate</span>
          <span>{entry.rate !== null ? `$${entry.rate.toFixed(2)}/hr` : '—'}</span>
        </div>
        <div className="attendance-card-row">
          <span className="attendance-card-label">Paid Hours</span>
          <span>{entry.paidHours || '—'}</span>
        </div>
        <div className="attendance-card-row">
          <span className="attendance-card-label">Volunteer Hours</span>
          <span>{entry.volunteerHours || '—'}</span>
        </div>
        <div className="attendance-card-row">
          <span className="attendance-card-label">Email</span>
          <span>{entry.email || '—'}</span>
        </div>
      </div>

      <div className="application-card-editable">
        <div className="application-card-field">
          <label htmlFor={`${fieldId}-missing`}>Missing Documents</label>
          <textarea
            id={`${fieldId}-missing`}
            rows={2}
            value={fields.missingDocuments}
            onChange={(event) => updateField('missingDocuments', event.target.value)}
          />
        </div>

        <div className="application-card-field">
          <label htmlFor={`${fieldId}-accept`}>Accept/Decline</label>
          <select
            id={`${fieldId}-accept`}
            value={fields.acceptDecline}
            onChange={(event) => updateField('acceptDecline', event.target.value)}
          >
            <option value="">—</option>
            <option value="Accept">Accept</option>
            <option value="Decline">Decline</option>
          </select>
        </div>

        <div className="application-card-editable-row">
          <div className="application-card-field">
            <label htmlFor={`${fieldId}-ss`}>SS</label>
            <input
              type="text"
              id={`${fieldId}-ss`}
              value={fields.ss}
              onChange={(event) => updateField('ss', event.target.value)}
            />
          </div>

          <div className="application-card-field">
            <label htmlFor={`${fieldId}-w4`}>W-4 Forms</label>
            <input
              type="text"
              id={`${fieldId}-w4`}
              value={fields.w4Forms}
              onChange={(event) => updateField('w4Forms', event.target.value)}
            />
          </div>
        </div>

        <div className="application-card-editable-row">
          <div className="application-card-field">
            <label htmlFor={`${fieldId}-resignation-email`}>Resignation Email Sent</label>
            <input
              type="text"
              id={`${fieldId}-resignation-email`}
              value={fields.resignationEmailSent}
              onChange={(event) => updateField('resignationEmailSent', event.target.value)}
            />
          </div>

          <div className="application-card-field">
            <label htmlFor={`${fieldId}-resignation-letter`}>Resignation Letters</label>
            <input
              type="text"
              id={`${fieldId}-resignation-letter`}
              value={fields.resignationLetters}
              onChange={(event) => updateField('resignationLetters', event.target.value)}
            />
          </div>
        </div>

        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>

        <StatusMessage text={status?.text} type={status?.type} />
      </div>
    </div>
  );
}
