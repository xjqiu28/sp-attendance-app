import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkHoursView from './WorkHoursView.jsx';

const DATA = {
  entries: [
    { name: 'Jane Doe', workHours: '9:00 AM - 3:00 PM', startTime: '09:00', endTime: '15:00' },
    { name: 'John Smith', workHours: null, startTime: '', endTime: '' },
  ],
};

function renderView(overrides = {}) {
  return render(
    <WorkHoursView data={DATA} loading={false} error={null} onSaveWorkHours={vi.fn()} onAddStaff={vi.fn()} viewMode="card" {...overrides} />
  );
}

describe('WorkHoursView', () => {
  it('shows the Add Staff button above a card per person', () => {
    renderView();

    expect(screen.getByRole('button', { name: '+ Add Staff' })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('shows a loading message instead of the cards', () => {
    renderView({ loading: true });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('shows an error', () => {
    renderView({ data: null, error: 'Network error — please try again.' });

    expect(screen.getByText('Network error — please try again.')).toHaveClass('error');
  });

  it('uses the list container in list view', () => {
    const { container } = renderView({ viewMode: 'list' });

    expect(container.querySelectorAll('.entry-list .attendance-row')).toHaveLength(2);
  });
});
