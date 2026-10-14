import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerateCodesButton from './GenerateCodesButton.tsx';

const IDLE = { loading: false, message: null, error: null };

describe('GenerateCodesButton', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<GenerateCodesButton state={IDLE} onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Generate New Codes' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled with a progress label while loading', () => {
    render(<GenerateCodesButton state={{ ...IDLE, loading: true }} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
  });

  it('shows a success message', () => {
    render(<GenerateCodesButton state={{ ...IDLE, message: 'Generated 2 new code(s).' }} onClick={() => {}} />);

    expect(screen.getByText('Generated 2 new code(s).')).toHaveClass('generate-codes-message', 'success');
  });

  it('shows an error message', () => {
    render(<GenerateCodesButton state={{ ...IDLE, error: 'Network error' }} onClick={() => {}} />);

    expect(screen.getByText('Network error')).toHaveClass('generate-codes-message', 'error');
  });
});
