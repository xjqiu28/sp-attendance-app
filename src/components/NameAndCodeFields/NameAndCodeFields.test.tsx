import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NameAndCodeFields from './NameAndCodeFields.tsx';

const BASE = {
  names: ['John Smith', 'Jane Doe'],
  namesLoading: false,
  namesLoadFailed: false,
  selectedName: '',
  onNameChange: () => {},
  code: '',
  onCodeChange: () => {},
};

describe('NameAndCodeFields', () => {
  describe('plain dropdown', () => {
    it('lists the names after a placeholder option', () => {
      render(<NameAndCodeFields {...BASE} />);

      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Select your name',
        'John Smith',
        'Jane Doe',
      ]);
    });

    it('reports the chosen name', async () => {
      const onNameChange = vi.fn();
      render(<NameAndCodeFields {...BASE} onNameChange={onNameChange} />);

      await userEvent.selectOptions(screen.getByLabelText('Full Name'), 'Jane Doe');

      expect(onNameChange).toHaveBeenCalledWith('Jane Doe');
    });

    it('is disabled while names load', () => {
      render(<NameAndCodeFields {...BASE} names={[]} namesLoading />);

      expect(screen.getByLabelText('Full Name')).toBeDisabled();
      expect(screen.getByRole('option')).toHaveTextContent('Loading names...');
    });

    it('says when names could not be loaded', () => {
      render(<NameAndCodeFields {...BASE} names={[]} namesLoadFailed />);

      expect(screen.getByLabelText('Full Name')).toBeDisabled();
      expect(screen.getByRole('option')).toHaveTextContent("Couldn't load names");
    });

    it('says when there are no names', () => {
      render(<NameAndCodeFields {...BASE} names={[]} />);

      expect(screen.getByRole('option')).toHaveTextContent('No names found');
    });
  });

  describe('searchable', () => {
    it('uses the searchable combobox instead of a dropdown', () => {
      render(<NameAndCodeFields {...BASE} searchable />);

      expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Type or select your name');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('shows the loading and failure states as placeholders', () => {
      const { rerender } = render(<NameAndCodeFields {...BASE} names={[]} namesLoading searchable />);
      expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Loading names...');
      expect(screen.getByRole('combobox')).toBeDisabled();

      rerender(<NameAndCodeFields {...BASE} names={[]} namesLoadFailed searchable />);
      expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', "Couldn't load names");
    });
  });

  it('reports what is typed into the personal code field', async () => {
    const onCodeChange = vi.fn();
    render(<NameAndCodeFields {...BASE} onCodeChange={onCodeChange} />);

    await userEvent.type(screen.getByLabelText('Personal Code'), '7');

    expect(onCodeChange).toHaveBeenCalledWith('7');
  });
});
