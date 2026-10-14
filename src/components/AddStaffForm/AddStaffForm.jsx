import { useState } from 'react';
import StatusMessage from '../StatusMessage/StatusMessage.jsx';
import '../LoginCard/LoginCard.scss'; // label/input/button base styles
import './AddStaffForm.scss';

const EMPTY_FORM = {
  name: '',
  birthday: '',
  personalCode: '',
  startTime: '',
  endTime: '',
  maxWeeklyHours: '',
  isAdmin: false,
};

// Collapsed to a single "Add Staff" button until opened, so it doesn't
// push the Work Hours cards below it down the page.
export default function AddStaffForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { text, type: 'success' | 'error' }

  function setField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setStatus({ text: 'A name is required.', type: 'error' });
      return;
    }

    if (!form.personalCode.trim() && !form.birthday) {
      setStatus({ text: 'Enter a personal code or a birthday to generate one from.', type: 'error' });
      return;
    }

    setSaving(true);
    setStatus({ text: 'Adding...', type: '' });

    const result = await onAdd(form);

    if (result.success) {
      setForm(EMPTY_FORM);
      setStatus({ text: result.message, type: 'success' });
    } else {
      setStatus({ text: result.error, type: 'error' });
    }

    setSaving(false);
  }

  if (!open) {
    return (
      <div className="add-staff-toggle">
        <button type="button" onClick={() => setOpen(true)}>
          + Add Staff
        </button>
        <StatusMessage text={status?.text} type={status?.type} />
      </div>
    );
  }

  return (
    <form className="add-staff" onSubmit={handleSubmit}>
      <h2>Add Staff</h2>

      <div className="add-staff-grid">
        <div className="add-staff-field add-staff-field-wide">
          <label htmlFor="add-staff-name">Name *</label>
          <input
            id="add-staff-name"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="First Last"
            autoComplete="off"
          />
        </div>

        <div className="add-staff-field">
          <label htmlFor="add-staff-birthday">Birthday</label>
          <input
            type="date"
            id="add-staff-birthday"
            value={form.birthday}
            onChange={(event) => setField('birthday', event.target.value)}
          />
        </div>

        <div className="add-staff-field">
          <label htmlFor="add-staff-code">Personal Code</label>
          <input
            id="add-staff-code"
            value={form.personalCode}
            onChange={(event) => setField('personalCode', event.target.value)}
            placeholder="Blank = birthday (MMDDYYYY)"
            autoComplete="off"
          />
        </div>

        <div className="add-staff-field">
          <label htmlFor="add-staff-start">Work Hours Start</label>
          <input
            type="time"
            id="add-staff-start"
            value={form.startTime}
            onChange={(event) => setField('startTime', event.target.value)}
          />
        </div>

        <div className="add-staff-field">
          <label htmlFor="add-staff-end">Work Hours End</label>
          <input
            type="time"
            id="add-staff-end"
            value={form.endTime}
            onChange={(event) => setField('endTime', event.target.value)}
          />
        </div>

        <div className="add-staff-field">
          <label htmlFor="add-staff-max-hours">Max Weekly Hours</label>
          <input
            type="number"
            id="add-staff-max-hours"
            min="0"
            step="0.5"
            value={form.maxWeeklyHours}
            onChange={(event) => setField('maxWeeklyHours', event.target.value)}
            placeholder="Optional"
          />
        </div>

        <label className="add-staff-admin" htmlFor="add-staff-admin">
          <input
            type="checkbox"
            id="add-staff-admin"
            checked={form.isAdmin}
            onChange={(event) => setField('isAdmin', event.target.checked)}
          />
          Admin (director access)
        </label>
      </div>

      <div className="add-staff-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Adding...' : 'Add Staff'}
        </button>
        <button type="button" className="add-staff-cancel" onClick={() => setOpen(false)} disabled={saving}>
          Close
        </button>
      </div>

      <StatusMessage text={status?.text} type={status?.type} />
    </form>
  );
}
