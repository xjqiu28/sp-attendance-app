import logo from '@/assets/oikos-logo.png';
import { ENVIRONMENT } from '@/config.js';
import './Sidebar.scss';

export const NAV_ITEMS = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'director', label: 'Director View' },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="Oikos Community Corporation" className="sidebar-logo" />
        <div className="sidebar-brand-text">
          <span className="sidebar-title">Oikos Community Corporation</span>
          <span className="sidebar-subtitle">Attendance</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeTab === item.id ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {ENVIRONMENT !== 'production' && <span className="sidebar-env-badge">{ENVIRONMENT}</span>}
    </aside>
  );
}
