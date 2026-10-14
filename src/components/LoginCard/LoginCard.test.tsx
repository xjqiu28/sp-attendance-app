import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LoginCard from './LoginCard.tsx';

const BASE = {
  title: 'Director View',
  subtitle: 'Enter your name and personal code to view attendance.',
  names: ['Alex Kim'],
  namesLoading: false,
  namesLoadFailed: false,
  selectedName: '',
  onNameChange: () => {},
  code: '',
  onCodeChange: () => {},
  onSubmit: (event: FormEvent) => event.preventDefault(),
  submitting: false,
  submitLabel: 'View Dashboard',
  status: null,
};

describe('LoginCard', () => {
  it('shows the title, subtitle and a single submit button', () => {
    render(<LoginCard {...BASE} />);

    expect(screen.getByRole('heading', { name: 'Director View' })).toBeInTheDocument();
    expect(screen.getByText('Enter your name and personal code to view attendance.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Dashboard' })).toBeEnabled();
  });

  it('disables the submit button while submitting', () => {
    render(<LoginCard {...BASE} submitting />);

    expect(screen.getByRole('button', { name: 'View Dashboard' })).toBeDisabled();
  });

  it('renders several submit buttons when given', () => {
    render(
      <LoginCard
        {...BASE}
        submitButtons={[
          { label: 'Sign In', value: 'in' },
          { label: 'Sign Out', value: 'out' },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Sign In' })).toHaveAttribute('value', 'in');
    expect(screen.getByRole('button', { name: 'Sign Out' })).toHaveAttribute('value', 'out');
    expect(screen.queryByRole('button', { name: 'View Dashboard' })).not.toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted', () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(<LoginCard {...BASE} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'View Dashboard' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the status message', () => {
    render(<LoginCard {...BASE} status={{ text: 'Incorrect personal code for that name.', type: 'error' }} />);

    expect(screen.getByText('Incorrect personal code for that name.')).toHaveClass('status', 'error');
  });

  it('explains a failed name load when there is no other status', () => {
    const { rerender } = render(<LoginCard {...BASE} names={[]} namesLoadFailed />);
    expect(screen.getByText("Couldn't load the name list — check the Web App URL.")).toBeInTheDocument();

    rerender(<LoginCard {...BASE} names={[]} namesLoadFailed status={{ text: 'Checking...', type: '' }} />);
    expect(screen.queryByText("Couldn't load the name list — check the Web App URL.")).not.toBeInTheDocument();
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('passes searchable through to the name field', () => {
    render(<LoginCard {...BASE} searchable />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
