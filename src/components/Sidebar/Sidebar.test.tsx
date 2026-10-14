import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

async function loadSidebar(environment: string) {
  vi.resetModules();
  vi.doMock('@/config.js', () => ({ ENVIRONMENT: environment }));
  return import('./Sidebar.tsx');
}

describe('Sidebar', () => {
  afterEach(() => {
    vi.doUnmock('@/config.js');
  });

  it('exports the two navigation items', async () => {
    const { NAV_ITEMS } = await loadSidebar('production');

    expect(NAV_ITEMS).toEqual([
      { id: 'attendance', label: 'Attendance' },
      { id: 'director', label: 'Director View' },
    ]);
  });

  it('marks the active tab', async () => {
    const { default: Sidebar } = await loadSidebar('production');
    render(<Sidebar activeTab="director" onTabChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Director View' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Attendance' })).not.toHaveClass('active');
  });

  it('calls onTabChange with the clicked tab id', async () => {
    const { default: Sidebar } = await loadSidebar('production');
    const onTabChange = vi.fn();
    render(<Sidebar activeTab="attendance" onTabChange={onTabChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Director View' }));

    expect(onTabChange).toHaveBeenCalledWith('director');
  });

  it('shows the environment badge only outside production', async () => {
    const { default: ProdSidebar } = await loadSidebar('production');
    const { container, unmount } = render(<ProdSidebar activeTab="attendance" onTabChange={() => {}} />);
    expect(container.querySelector('.sidebar-env-badge')).not.toBeInTheDocument();
    unmount();

    const { default: DevSidebar } = await loadSidebar('dev');
    render(<DevSidebar activeTab="attendance" onTabChange={() => {}} />);
    expect(screen.getByText('dev')).toHaveClass('sidebar-env-badge');
  });
});
