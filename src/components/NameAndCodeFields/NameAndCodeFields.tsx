import NameCombobox from '../NameCombobox/NameCombobox.tsx';

// searchable swaps the plain dropdown for one you can type into to
// find your name (see NameCombobox).
export interface NameAndCodeFieldsProps {
  names: string[];
  namesLoading: boolean;
  namesLoadFailed: boolean;
  searchable?: boolean;
  selectedName: string;
  onNameChange: (name: string) => void;
  code: string;
  onCodeChange: (code: string) => void;
}

export default function NameAndCodeFields({
  names,
  namesLoading,
  namesLoadFailed,
  searchable,
  selectedName,
  onNameChange,
  code,
  onCodeChange,
}: NameAndCodeFieldsProps) {
  const namesUnavailable = !namesLoading && names.length === 0;

  return (
    <>
      <label htmlFor="name">Full Name</label>
      {searchable ? (
        <NameCombobox
          id="name"
          names={names}
          disabled={namesLoading || namesUnavailable}
          placeholder={
            namesLoading
              ? 'Loading names...'
              : namesUnavailable
                ? namesLoadFailed
                  ? "Couldn't load names"
                  : 'No names found'
                : 'Type or select your name'
          }
          selectedName={selectedName}
          onNameChange={onNameChange}
        />
      ) : (
        <select
          id="name"
          value={selectedName}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={namesLoading || namesUnavailable}
        >
          {namesLoading && <option value="">Loading names...</option>}

          {namesUnavailable && (
            <option value="">{namesLoadFailed ? "Couldn't load names" : 'No names found'}</option>
          )}

          {!namesLoading && !namesUnavailable && (
            <>
              <option value="">Select your name</option>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </>
          )}
        </select>
      )}

      <label htmlFor="code">Personal Code</label>
      <input
        type="text"
        id="code"
        placeholder="e.g. A12345"
        autoComplete="off"
        value={code}
        onChange={(event) => onCodeChange(event.target.value)}
      />
    </>
  );
}
