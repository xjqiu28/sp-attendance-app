import { useState } from 'react';
import AppHeader from './components/AppHeader/AppHeader.jsx';
import Sidebar, { NAV_ITEMS } from './components/Sidebar/Sidebar.jsx';
import AttendanceForm from './components/AttendanceForm/AttendanceForm.jsx';
import DirectorDashboard from './components/DirectorDashboard/DirectorDashboard.jsx';
import useNames from './hooks/useNames.js';
import './App.scss';

// The name roster is fetched ONCE here and passed down to whichever
// tab is active, instead of each tab fetching it independently —
// switching tabs no longer re-triggers a network call.
export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const { names, loading: namesLoading, failed: namesLoadFailed } = useNames();

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Sidebar takes over navigation at the App.scss row breakpoint —
          this stays mounted (not just narrower) so narrow screens still
          get a header + nav with no extra breakpoint logic in JS. */}
      <div className="app-mobile-header">
        <AppHeader />
        <nav className="tabs app-mobile-tabs">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="app-main">
        {activeTab === 'attendance' ? (
          <AttendanceForm names={names} namesLoading={namesLoading} namesLoadFailed={namesLoadFailed} />
        ) : (
          <DirectorDashboard
            names={names}
            namesLoading={namesLoading}
            namesLoadFailed={namesLoadFailed}
          />
        )}
      </main>
    </div>
  );
}
