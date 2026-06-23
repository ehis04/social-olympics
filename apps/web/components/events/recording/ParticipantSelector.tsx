'use client';

import Image from 'next/image';

interface Participant {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ParticipantSelectorProps {
  members: Participant[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onContinue: () => void;
}

export function ParticipantSelector({
  members,
  selected,
  onChange,
  onContinue,
}: ParticipantSelectorProps) {
  const allSelected = selected.length === members.length;

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(members.map((m) => m.profileId));
    }
  }

  function toggleMember(profileId: string) {
    if (selected.includes(profileId)) {
      onChange(selected.filter((id) => id !== profileId));
    } else {
      onChange([...selected, profileId]);
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-grey-900">Who is competing?</h2>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm text-primary hover:underline"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {members.map((member) => {
          const isSelected = selected.includes(member.profileId);
          return (
            <button
              key={member.profileId}
              type="button"
              onClick={() => toggleMember(member.profileId)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-grey-200 bg-white hover:border-grey-300'
              }`}
            >
              <div className="shrink-0">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.displayName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-grey-200 text-sm font-bold text-grey-600">
                    {member.displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="flex-1 min-w-0 truncate text-sm font-medium text-grey-900">
                {member.displayName}
              </span>
              <div
                className={`h-4 w-4 shrink-0 rounded border-2 ${
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-grey-300 bg-white'
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 12 12" fill="none" className="h-full w-full">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-grey-100 pt-4">
        <p className="text-sm text-grey-500">
          {selected.length} participant{selected.length !== 1 ? 's' : ''} selected
        </p>
        <button
          type="button"
          onClick={onContinue}
          disabled={selected.length === 0}
          className="rounded-md bg-primary py-2.5 px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
