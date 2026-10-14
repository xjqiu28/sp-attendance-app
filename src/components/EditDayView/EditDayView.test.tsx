import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EditDayView from './EditDayView.tsx';
import type { EditDayView as EditDayViewData } from '@/api/attendanceApi.ts';

const DATA: EditDayViewData = {
  date: '10/5/2026',
  entries: [
    { name: 'Jane Doe', signInTime: null, signOutTime: null, sessions: null },
    { name: 'John Smith', signInTime: '10/5/2026 9:00:00 AM', signOutTime: null, sessions: null },
  ],
};

function renderView(overrides: Partial<ComponentProps<typeof EditDayView>> = {}) {
  const props: ComponentProps<typeof EditDayView> = {
    date: '2026-10-05',
    onDateChange: vi.fn(),
    data: DATA,
    loading: false,
    error: null,
    onSaveEntry: vi.fn(),
    viewMode: 'card',
    ...overrides,
  };
  return { props, ...render(<EditDayView {...props} />) };
}

describe('EditDayView', () => {
  it('shows the selected date', () => {
    renderView();

    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-05');
  });

  it('reports a new date', () => {
    const { props } = renderView();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-06' } });

    expect(props.onDateChange).toHaveBeenCalledWith('2026-10-06');
  });

  it('renders an editable card per person', () => {
    renderView();

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Save' })).toHaveLength(2);
  });

  it('shows a loading message instead of the cards', () => {
    renderView({ loading: true });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('shows an error', () => {
    renderView({ error: 'A date is required.', data: null });

    expect(screen.getByText('A date is required.')).toHaveClass('error');
  });
});
