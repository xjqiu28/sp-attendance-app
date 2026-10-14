import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerateReportPanel from './GenerateReportPanel.tsx';

describe('GenerateReportPanel', () => {
  it('renders nothing without a week', () => {
    expect(render(<GenerateReportPanel weekStart={null} onGenerate={vi.fn()} />).container).toBeEmptyDOMElement();
  });

  it("labels the report with the week's Monday to Friday", () => {
    render(<GenerateReportPanel weekStart="10/5/2026" onGenerate={vi.fn()} />);

    expect(screen.getByText('Report for 10/5 - 10/9 (Mon-Fri)')).toBeInTheDocument();
  });

  it('handles a work week that crosses into the next month', () => {
    render(<GenerateReportPanel weekStart="9/28/2026" onGenerate={vi.fn()} />);

    expect(screen.getByText('Report for 9/28 - 10/2 (Mon-Fri)')).toBeInTheDocument();
  });

  it('pre-fills the last email used', () => {
    localStorage.setItem('generateReportEmail', 'saved@example.com');
    render(<GenerateReportPanel weekStart="10/5/2026" onGenerate={vi.fn()} />);

    expect(screen.getByLabelText('Email to send the report to')).toHaveValue('saved@example.com');
  });

  it('generates and emails the report, shows its links, and remembers the email', async () => {
    const onGenerate = vi.fn().mockResolvedValue({
      success: true,
      message: 'Report written.',
      reportUrl: 'https://example.com/report',
      sharedCopyUrl: 'https://example.com/copy',
    });
    render(<GenerateReportPanel weekStart="10/5/2026" onGenerate={onGenerate} />);

    await userEvent.type(screen.getByLabelText('Email to send the report to'), '  boss@example.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(onGenerate).toHaveBeenCalledWith('10/5/2026', 'boss@example.com');
    expect(await screen.findByText(/Report written\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open report tab' })).toHaveAttribute('href', 'https://example.com/report');
    expect(screen.getByRole('link', { name: 'Open shared copy' })).toHaveAttribute('href', 'https://example.com/copy');
    expect(localStorage.getItem('generateReportEmail')).toBe('boss@example.com');
  });

  it('generates without an email and does not save one', async () => {
    const onGenerate = vi.fn().mockResolvedValue({ success: true, message: 'Report written.', reportUrl: null });
    render(<GenerateReportPanel weekStart="10/5/2026" onGenerate={onGenerate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(onGenerate).toHaveBeenCalledWith('10/5/2026', '');
    expect(await screen.findByText(/Report written\./)).toBeInTheDocument();
    expect(localStorage.getItem('generateReportEmail')).toBeNull();
  });

  it('shows the error when generating fails', async () => {
    const onGenerate = vi.fn().mockResolvedValue({ success: false, error: 'No data for that week.' });
    render(<GenerateReportPanel weekStart="10/5/2026" onGenerate={onGenerate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(await screen.findByText('No data for that week.')).toHaveClass('generate-report-message', 'error');
  });
});
