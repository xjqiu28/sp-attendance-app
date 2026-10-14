import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ENVIRONMENT differs between the prod and dev copies of config.js, so
// each test loads AppHeader against its own mocked value.
async function renderWithEnvironment(environment: string) {
  vi.resetModules();
  vi.doMock('@/config.js', () => ({ ENVIRONMENT: environment }));
  const { default: AppHeader } = await import('./AppHeader.tsx');
  return render(<AppHeader />);
}

describe('AppHeader', () => {
  afterEach(() => {
    vi.doUnmock('@/config.js');
  });

  it('shows the title with no badge in production', async () => {
    const { container } = await renderWithEnvironment('production');

    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(container.querySelector('.env-badge')).not.toBeInTheDocument();
  });

  it('shows the environment badge outside production', async () => {
    await renderWithEnvironment('dev');

    expect(screen.getByText('dev')).toHaveClass('env-badge');
  });
});
