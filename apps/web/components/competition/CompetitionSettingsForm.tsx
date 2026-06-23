'use client';

// Competition settings form — editable fields, weighting editor, voting toggles, danger zone
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};
type CompetitionEventRow = Database['public']['Tables']['competition_events']['Row'] & {
  event: Database['public']['Tables']['events']['Row'] | null;
};
type WeightTag = Database['public']['Enums']['weight_tag'];

interface Props {
  competition: CompetitionRow;
  members: MemberWithProfile[];
  competitionEvents: CompetitionEventRow[];
}

const WEIGHT_OPTIONS: { label: string; tag: WeightTag; multiplier: number }[] = [
  { label: 'Not Important (0.5×)', tag: 'not_important', multiplier: 0.5 },
  { label: 'Standard (1×)', tag: 'standard', multiplier: 1.0 },
  { label: 'Important (1.5×)', tag: 'important', multiplier: 1.5 },
  { label: 'Very Important (2×)', tag: 'very_important', multiplier: 2.0 },
  { label: 'Custom', tag: 'custom', multiplier: 1.0 },
];

export default function CompetitionSettingsForm({ competition, members, competitionEvents }: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [weightingChanged, setWeightingChanged] = useState(false);

  const [form, setForm] = useState({
    name: competition.name,
    description: competition.description ?? '',
    is_public: competition.is_public,
    country_code: competition.country_code ?? '',
    city: competition.city ?? '',
    prize_pot_per_person: competition.prize_pot_per_person?.toString() ?? '',
    cohost_id: competition.cohost_id ?? '',
    mvp_voting_enabled: competition.mvp_voting_enabled,
    worst_performer_enabled: competition.worst_performer_enabled,
  });

  const [eventWeights, setEventWeights] = useState<
    Record<string, { weight_tag: WeightTag; weight_multiplier: number }>
  >(
    Object.fromEntries(
      competitionEvents.map((ce) => [
        ce.id,
        {
          weight_tag: ce.weight_tag as WeightTag,
          weight_multiplier: ce.weight_multiplier,
        },
      ]),
    ),
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleWeightChange(ceId: string, tag: WeightTag, multiplier: number) {
    setEventWeights((prev) => ({ ...prev, [ceId]: { weight_tag: tag, weight_multiplier: multiplier } }));
    setWeightingChanged(true);
  }

  async function handleSave() {
    if (!form.name.trim() || form.name.trim().length < 3) {
      toast.error('Competition name must be at least 3 characters');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_public: form.is_public,
        country_code: form.country_code || null,
        city: form.city.trim() || null,
        prize_pot_per_person: form.prize_pot_per_person
          ? parseFloat(form.prize_pot_per_person)
          : null,
        cohost_id: form.cohost_id || null,
        mvp_voting_enabled: form.mvp_voting_enabled,
        worst_performer_enabled: form.worst_performer_enabled,
        eventWeights,
      };

      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to save settings');
        return;
      }

      toast.success('Settings saved');
      setWeightingChanged(false);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete() {
    try {
      const res = await fetch(`/api/competitions/${competition.id}/complete`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to complete competition');
        return;
      }
      toast.success('Competition completed!');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setShowCompleteConfirm(false);
    }
  }

  const votingLocked = competition.voting_locked;
  const canEditCohost =
    competition.status === 'setup' || competition.status === 'open';
  const eligibleCohosts = members.filter(
    (m) => m.profile_id !== competition.host_id && m.status !== 'withdrawn',
  );

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <section className="rounded-lg border border-grey-200 bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-grey-800">Basic info</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-grey-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              maxLength={60}
              className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-grey-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-grey-700">Visibility</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update('is_public', true)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  form.is_public
                    ? 'border-primary bg-primary-muted text-primary'
                    : 'border-grey-200 text-grey-600 hover:border-grey-300'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => update('is_public', false)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  !form.is_public
                    ? 'border-primary bg-primary-muted text-primary'
                    : 'border-grey-200 text-grey-600 hover:border-grey-300'
                }`}
              >
                Private
              </button>
            </div>
            {!form.is_public && (
              <p className="mt-1 text-xs text-grey-400">
                Existing members retain access.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">Country</label>
              <select
                value={form.country_code}
                onChange={(e) => update('country_code', e.target.value)}
                className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-700 focus:border-primary focus:outline-none"
              >
                <option value="">None</option>
                <option value="IE">Ireland</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="AU">Australia</option>
                <option value="CA">Canada</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-800 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-grey-700">
              Suggested contribution per player (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.prize_pot_per_person}
              onChange={(e) => update('prize_pot_per_person', e.target.value)}
              className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-800 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-grey-400">
              Informational only — the platform does not process payments.
            </p>
          </div>
          {canEditCohost && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">Co-host</label>
              <select
                value={form.cohost_id}
                onChange={(e) => update('cohost_id', e.target.value)}
                className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-700 focus:border-primary focus:outline-none"
              >
                <option value="">None</option>
                {eligibleCohosts.map((m) => (
                  <option key={m.profile_id} value={m.profile_id ?? ''}>
                    {m.profile?.display_name ?? 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Voting toggles */}
      <section className="rounded-lg border border-grey-200 bg-white p-6">
        <h2 className="mb-1 text-base font-bold text-grey-800">Voting settings</h2>
        {votingLocked && (
          <p className="mb-4 flex items-center gap-1.5 text-xs text-amber-600">
            <Lock size={12} />
            Locked — the first event has started
          </p>
        )}
        <div className="space-y-4">
          {(
            [
              { key: 'mvp_voting_enabled', label: 'Enable MVP voting', desc: '+1 bonus point to winner' },
              { key: 'worst_performer_enabled', label: 'Enable worst performer voting', desc: '-1 point penalty' },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-grey-800">{label}</p>
                <p className="text-xs text-grey-500">{desc}</p>
              </div>
              <button
                type="button"
                disabled={votingLocked}
                onClick={() => !votingLocked && update(key, !form[key])}
                className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                  form[key] ? 'bg-primary' : 'bg-grey-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form[key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Event weighting */}
      {competitionEvents.length > 0 && (
        <section className="rounded-lg border border-grey-200 bg-white p-6">
          <h2 className="mb-1 text-base font-bold text-grey-800">Event weighting</h2>
          <p className="mb-4 text-xs text-grey-500">
            Changing weights will immediately recalculate all competitor scores.
          </p>

          {weightingChanged && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Changing event weights will recalculate all competitor scores immediately once saved.
              </span>
            </div>
          )}

          <div className="space-y-3">
            {competitionEvents.map((ce) => {
              const w = eventWeights[ce.id] ?? { weight_tag: 'standard', weight_multiplier: 1.0 };
              const isCustom = w.weight_tag === 'custom';
              return (
                <div key={ce.id} className="rounded-lg border border-grey-100 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-grey-800">
                      {ce.event?.name ?? 'Unknown event'}
                    </span>
                    <span className="text-xs text-grey-400">
                      1st = {(10 * w.weight_multiplier).toFixed(1)} pts
                    </span>
                  </div>
                  <select
                    value={w.weight_tag}
                    onChange={(e) => {
                      const opt = WEIGHT_OPTIONS.find((o) => o.tag === e.target.value);
                      handleWeightChange(
                        ce.id,
                        e.target.value as WeightTag,
                        opt?.multiplier ?? 1.0,
                      );
                    }}
                    className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-700 focus:border-primary focus:outline-none"
                  >
                    {WEIGHT_OPTIONS.map((o) => (
                      <option key={o.tag} value={o.tag}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {isCustom && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-grey-500">Custom multiplier:</label>
                      <input
                        type="number"
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        value={w.weight_multiplier}
                        onChange={(e) => {
                          const val = Math.min(3.0, Math.max(0.1, parseFloat(e.target.value) || 0.1));
                          handleWeightChange(ce.id, 'custom', val);
                        }}
                        className="w-20 rounded border border-grey-200 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      />
                      <span className="text-xs text-grey-400">× (0.1–3.0)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
      >
        {isSaving ? 'Saving…' : 'Save settings'}
      </button>

      {/* Danger zone */}
      {(competition.status === 'active' || competition.status === 'complete') && (
        <section className="rounded-lg border-2 border-red-200 bg-white p-6">
          <h2 className="mb-4 text-base font-bold text-red-700">Danger zone</h2>
          <div className="space-y-3">
            {competition.status === 'active' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-grey-800">Complete competition</p>
                  <p className="text-xs text-grey-500">
                    Finalises all scores and generates the podium. Cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  className="shrink-0 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Complete
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={showCompleteConfirm}
        title="Complete competition?"
        message="This will finalise all scores and generate the podium. All events will be locked. This cannot be undone."
        confirmLabel="Complete"
        isDanger
        onConfirm={handleComplete}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </div>
  );
}
