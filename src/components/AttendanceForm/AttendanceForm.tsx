import { useState, type FormEvent } from 'react';
import { submitAttendance } from '../../api/attendanceApi.ts';
import LoginCard from '../LoginCard/LoginCard.tsx';
import type { StatusText } from '@/hooks/useDirectorDashboard.ts';

interface AttendanceFormProps {
  names: string[];
  namesLoading: boolean;
  namesLoadFailed: boolean;
}

export default function AttendanceForm({ names, namesLoading, namesLoadFailed }: AttendanceFormProps) {
  const [selectedName, setSelectedName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusText | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Which button was pressed. Pressing Enter in the code field
    // submits with the first one (Sign In) — harmless, since the
    // backend rejects a Sign In while already signed in.
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const direction = submitter?.value === 'out' ? 'out' : 'in';

    const trimmedCode = code.trim();

    if (!selectedName || !trimmedCode) {
      setStatus({ text: 'Please select your name and enter your personal code.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setStatus({ text: 'Checking...', type: '' });

    try {
      const result = await submitAttendance(selectedName, trimmedCode, direction);

      if (result.success) {
        setStatus({ text: result.message, type: 'success' });
        setCode('');
      } else {
        setStatus({ text: result.error, type: 'error' });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus({
          text: "This is taking too long. Please check the sheet before submitting again — your entry may have already gone through.",
          type: 'error',
        });
      } else {
        setStatus({ text: 'Network error — please try again.', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginCard
      title="Attendance"
      subtitle="Type or select your name, enter your personal code, then press Sign In or Sign Out."
      names={names}
      searchable
      namesLoading={namesLoading}
      namesLoadFailed={namesLoadFailed}
      selectedName={selectedName}
      onNameChange={setSelectedName}
      code={code}
      onCodeChange={setCode}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitButtons={[
        { label: 'Sign In', value: 'in' },
        { label: 'Sign Out', value: 'out' },
      ]}
      status={status}
    />
  );
}
