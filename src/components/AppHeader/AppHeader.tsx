import { ENVIRONMENT } from '@/config.js';
import './AppHeader.scss';

export default function AppHeader() {
  return (
    <header className="app-header">
      <span className="app-header-title">Attendance</span>
      {ENVIRONMENT !== 'production' && <span className="env-badge">{ENVIRONMENT}</span>}
    </header>
  );
}
