import logo from '@/assets/oikos-logo.png';
import { ENVIRONMENT } from '@/config.js';
import './AppHeader.scss';

export default function AppHeader() {
  return (
    <header className="app-header">
      <img src={logo} alt="Oikos Community Corporation" className="app-header-logo" />
      <div className="app-header-text">
        <span className="app-header-title">Oikos Community Corporation</span>
        <span className="app-header-subtitle">Attendance</span>
      </div>
      {ENVIRONMENT !== 'production' && <span className="env-badge">{ENVIRONMENT}</span>}
    </header>
  );
}
