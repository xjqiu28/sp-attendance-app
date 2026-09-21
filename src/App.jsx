import { useState } from 'react';
import AttendanceForm from './components/AttendanceForm/AttendanceForm.jsx';
import DirectorDashboard from './components/DirectorDashboard/DirectorDashboard.jsx';
import useNames from './hooks/useNames.js';
import { ENVIRONMENT } from './config.js';
import './App.scss';

// The name roster is fetched ONCE here and passed down to whichever
// tab is active, instead of each tab fetching it independently —
// switching tabs no longer re-triggers a network call.
export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const { names, loading: namesLoading, failed: namesLoadFailed } = useNames();

  return (
    <div className="app">
      {ENVIRONMENT !== 'production' && <div className="env-badge">{ENVIRONMENT}</div>}
      <nav className="tabs">
        <button
          type="button"
          className={activeTab === 'attendance' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          type="button"
          className={activeTab === 'director' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('director')}
        >
          Director View
        </button>
      </nav>

      {activeTab === 'attendance' ? (
        <AttendanceForm names={names} namesLoading={namesLoading} namesLoadFailed={namesLoadFailed} />
      ) : (
        <DirectorDashboard
          names={names}
          namesLoading={namesLoading}
          namesLoadFailed={namesLoadFailed}
        />
      )}
    </div>
  );
}
