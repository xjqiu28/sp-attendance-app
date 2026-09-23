import { useState } from 'react';
import '@/App.scss'; // .tab, reused here for the button's base look
import './GenerateReportPanel.scss';

const EMAIL_STORAGE_KEY = 'generateReportEmail';

// Remembers the last address typed in, per browser, so a director
// sending the same report every week doesn't retype it. Storage can be
// unavailable (private windows, blocked site data) — fall back quietly.
function loadSavedEmail() {
  try {
    return localStorage.getItem(EMAIL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveEmail(email) {
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  } catch {
    // Not worth surfacing — the report itself still went through.
  }
}

// Monday "M/d/yyyy" -> "M/d - M/d" for that week's Monday-Friday,
// matching the report tab the backend writes (see
// generateReportForWeek, gas/WeeklyReport.gs).
function formatWorkWeek(weekStart) {
  const [month, day, year] = weekStart.split('/').map(Number);
  const friday = new Date(year, month - 1, day + 4);
  return `${month}/${day} - ${friday.getMonth() + 1}/${friday.getDate()}`;
}

// Weekly tab's "Generate Report": writes the timesheet tab for the
// selected week and, if an email is entered, sends it there too.
// Keyed by weekStart in WeeklyView, so switching weeks resets the
// status message instead of showing a link to a different week's tab.
export default function GenerateReportPanel({ weekStart, onGenerate }) {
  const [email, setEmail] = useState(loadSavedEmail);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null); // { text, type, reportUrl }

  if (!weekStart) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    setGenerating(true);
    setStatus({ text: trimmedEmail ? 'Generating and emailing...' : 'Generating...', type: '' });

    const result = await onGenerate(weekStart, trimmedEmail);

    if (result.success) {
      setStatus({ text: result.message, type: 'success', reportUrl: result.reportUrl });

      if (trimmedEmail) {
        saveEmail(trimmedEmail);
      }
    } else {
      setStatus({ text: result.error, type: 'error' });
    }

    setGenerating(false);
  }

  return (
    <form className="generate-report" onSubmit={handleSubmit}>
      <div className="generate-report-row">
        <span className="generate-report-label">Report for {formatWorkWeek(weekStart)} (Mon-Fri)</span>

        <input
          type="email"
          className="generate-report-email"
          placeholder="Email to send it to (optional)"
          aria-label="Email to send the report to"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <button type="submit" className="tab generate-report-button" disabled={generating}>
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {status?.text && (
        <p className={`generate-report-message ${status.type}`}>
          {status.text}{' '}
          {status.reportUrl && (
            <a href={status.reportUrl} target="_blank" rel="noreferrer">
              Open report
            </a>
          )}
        </p>
      )}
    </form>
  );
}
