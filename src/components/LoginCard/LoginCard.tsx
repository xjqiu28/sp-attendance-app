import type { FormEvent } from 'react';
import NameAndCodeFields, { type NameAndCodeFieldsProps } from '../NameAndCodeFields/NameAndCodeFields.tsx';
import type { StatusText } from '@/hooks/useDirectorDashboard.ts';
import StatusMessage from '../StatusMessage/StatusMessage.tsx';
import './LoginCard.scss';

// Shared name + personal code login card, used by both the
// attendance form and the director dashboard's sign-in screen.
interface LoginCardProps extends NameAndCodeFieldsProps {
  title: string;
  subtitle: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  // One submit button with this label — or, with submitButtons, several
  // side by side.
  submitLabel?: string;
  submitButtons?: { label: string; value: string }[];
  status: StatusText | null;
}

export default function LoginCard({
  title,
  subtitle,
  names,
  namesLoading,
  namesLoadFailed,
  searchable,
  selectedName,
  onNameChange,
  code,
  onCodeChange,
  onSubmit,
  submitting,
  submitLabel,
  submitButtons,
  status,
}: LoginCardProps) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>

      <form onSubmit={onSubmit}>
        <NameAndCodeFields
          names={names}
          namesLoading={namesLoading}
          namesLoadFailed={namesLoadFailed}
          searchable={searchable}
          selectedName={selectedName}
          onNameChange={onNameChange}
          code={code}
          onCodeChange={onCodeChange}
        />

        {submitButtons ? (
          // Several submit buttons side by side — the form's onSubmit
          // reads which one was pressed from event.nativeEvent.submitter.
          <div className="login-card-buttons">
            {submitButtons.map((button) => (
              <button key={button.value} type="submit" name="action" value={button.value} disabled={submitting}>
                {button.label}
              </button>
            ))}
          </div>
        ) : (
          <button type="submit" disabled={submitting}>
            {submitLabel}
          </button>
        )}
      </form>

      {namesLoadFailed && !status ? (
        <StatusMessage text="Couldn't load the name list — check the Web App URL." type="error" />
      ) : (
        <StatusMessage text={status?.text} type={status?.type} />
      )}
    </div>
  );
}
