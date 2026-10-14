import { ENVIRONMENT } from '@/config.js';
import './Sidebar.scss';

export const NAV_ITEMS = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'director', label: 'Director View' },
] as const;

export type AppTab = (typeof NAV_ITEMS)[number]['id'];

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-title">Attendance</span>
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
