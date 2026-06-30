'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Copy, Trophy, UserPlus, Ghost, X } from 'lucide-react';
import Image from 'next/image';
import ROUTES from '@/constants/routes';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventWithCategory = EventRow & {
  event_categories?: { name: string; slug: string } | null;
};

type WeightTag = 'not_important' | 'standard' | 'important' | 'very_important' | 'custom';

interface MemberEntry {
  tempId: string;
  displayName: string;
  avatarUrl: string | null;
  type: 'follow' | 'ghost';
  profileId?: string;
}

interface FollowProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface FormState {
  name: string;
  description: string;
  is_public: boolean;
  country_code: string;
  city: string;
  prize_pot_per_person: string;
  selectedEventIds: string[];
  min_events_required: number;
  eventWeights: Record<string, { weight_tag: WeightTag; weight_multiplier: number }>;
  mvp_voting_enabled: boolean;
  worst_performer_enabled: boolean;
  inviteEmails: string[];
  members: MemberEntry[];
  eventAssignments: Record<string, string[]>; // eventLibraryId -> tempId[]
}

const WEIGHT_OPTIONS: { label: string; tag: WeightTag; multiplier: number }[] = [
  { label: 'Not Important (0.5×)', tag: 'not_important', multiplier: 0.5 },
  { label: 'Standard (1×)', tag: 'standard', multiplier: 1.0 },
  { label: 'Important (1.5×)', tag: 'important', multiplier: 1.5 },
  { label: 'Very Important (2×)', tag: 'very_important', multiplier: 2.0 },
  { label: 'Custom', tag: 'custom', multiplier: 1.0 },
];

const STEP_LABELS = ['Info', 'Events', 'Weighting', 'Members', 'Assign', 'Review'];
const TOTAL_STEPS = STEP_LABELS.length;

interface Props {
  events: EventWithCategory[];
  currentUserId: string;
}

export default function CreateCompetitionForm({ events, currentUserId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [ghostNameInput, setGhostNameInput] = useState('');
  const [ghostCounter, setGhostCounter] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [following, setFollowing] = useState<FollowProfile[] | null>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    is_public: true,
    country_code: '',
    city: '',
    prize_pot_per_person: '',
    selectedEventIds: [],
    min_events_required: 1,
    eventWeights: {},
    mvp_voting_enabled: true,
    worst_performer_enabled: true,
    inviteEmails: [],
    members: [],
    eventAssignments: {},
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  const followsLoading = step === 4 && following === null;

  useEffect(() => {
    if (step !== 4) return;
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${currentUserId}/follows`, { signal: controller.signal });
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setFollowing((json?.data?.following ?? []) as FollowProfile[]);
      } catch {
        if (!cancelled) setFollowing([]);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [step, currentUserId]);

  const eventsByCategory = events.reduce<Record<string, EventWithCategory[]>>((acc, event) => {
    const cat = event.event_categories?.name ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(event);
    return acc;
  }, {});

  function toggleEvent(eventId: string) {
    const selected = form.selectedEventIds;
    const isSelected = selected.includes(eventId);
    const newSelected = isSelected
      ? selected.filter((id) => id !== eventId)
      : [...selected, eventId];
    const newWeights = { ...form.eventWeights };
    if (!isSelected && !newWeights[eventId]) {
      newWeights[eventId] = { weight_tag: 'standard', weight_multiplier: 1.0 };
    }
    // Remove from eventAssignments if deselected
    const newAssignments = { ...form.eventAssignments };
    if (isSelected) delete newAssignments[eventId];
    setForm((prev) => ({
      ...prev,
      selectedEventIds: newSelected,
      eventWeights: newWeights,
      eventAssignments: newAssignments,
      min_events_required: Math.min(prev.min_events_required, newSelected.length || 1),
    }));
  }

  function addFollowMember(profile: FollowProfile) {
    const tempId = `follow:${profile.id}`;
    if (form.members.some((m) => m.tempId === tempId)) return;
    update('members', [
      ...form.members,
      { tempId, displayName: profile.display_name, avatarUrl: profile.avatar_url, type: 'follow', profileId: profile.id },
    ]);
  }

  function addGhostMember() {
    const name = ghostNameInput.trim();
    if (name.length < 2) return;
    const tempId = `ghost:${ghostCounter}`;
    setGhostCounter((c) => c + 1);
    update('members', [
      ...form.members,
      { tempId, displayName: name, avatarUrl: null, type: 'ghost' },
    ]);
    setGhostNameInput('');
  }

  function removeMember(tempId: string) {
    // Remove from members list and all event assignments
    const newAssignments: Record<string, string[]> = {};
    for (const [evId, ids] of Object.entries(form.eventAssignments)) {
      newAssignments[evId] = ids.filter((id) => id !== tempId);
    }
    setForm((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.tempId !== tempId),
      eventAssignments: newAssignments,
    }));
  }

  function toggleEventAssignment(eventLibraryId: string, tempId: string) {
    const current = form.eventAssignments[eventLibraryId] ?? [];
    const updated = current.includes(tempId)
      ? current.filter((id) => id !== tempId)
      : [...current, tempId];
    update('eventAssignments', { ...form.eventAssignments, [eventLibraryId]: updated });
  }

  function assignAllToEvent(eventLibraryId: string) {
    const allTempIds = form.members.map((m) => m.tempId);
    update('eventAssignments', { ...form.eventAssignments, [eventLibraryId]: allTempIds });
  }

  function clearEventAssignment(eventLibraryId: string) {
    update('eventAssignments', { ...form.eventAssignments, [eventLibraryId]: [] });
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters';
    if (form.name.trim().length > 60) errs.name = 'Name must be 60 characters or fewer';
    if (form.description.length > 500) errs.description = 'Description must be 500 characters or fewer';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    if (form.selectedEventIds.length === 0) {
      setErrors({ selectedEventIds: 'Select at least one event' });
      return false;
    }
    return true;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || form.inviteEmails.includes(email)) return;
    update('inviteEmails', [...form.inviteEmails, email]);
    setEmailInput('');
  }

  function removeEmail(email: string) {
    update('inviteEmails', form.inviteEmails.filter((e) => e !== email));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const followProfileIds = form.members
        .filter((m) => m.type === 'follow')
        .map((m) => m.profileId!);

      const ghostMembers = form.members
        .filter((m) => m.type === 'ghost')
        .map((m) => ({ tempId: m.tempId, displayName: m.displayName }));

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_public: form.is_public,
        country_code: form.country_code || null,
        city: form.city.trim() || null,
        prize_pot_per_person: form.prize_pot_per_person ? parseFloat(form.prize_pot_per_person) : null,
        min_events_required: form.min_events_required,
        mvp_voting_enabled: form.mvp_voting_enabled,
        worst_performer_enabled: form.worst_performer_enabled,
        selectedEventIds: form.selectedEventIds,
        eventWeights: form.eventWeights,
        inviteEmails: form.inviteEmails,
        followProfileIds,
        ghostMembers,
        eventAssignments: form.eventAssignments,
      };

      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create competition');
        return;
      }

      toast.success('Competition created!');
      router.replace(ROUTES.COMPETITION_FEED(json.data.id));
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewInviteCode = 'XXXXXXXX';
  const previewInviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${previewInviteCode}`;

  const addedFollowIds = new Set(
    form.members.filter((m) => m.type === 'follow').map((m) => m.profileId),
  );

  return (
    <div className="rounded-lg border border-grey-200 bg-white shadow-sm">
      {/* Step indicator */}
      <div className="border-b border-grey-100 px-6 py-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const done = stepNum < step;
            const active = stepNum === step;
            return (
              <div key={label} className="flex shrink-0 items-center gap-1">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    done || active ? 'bg-primary text-white' : 'bg-grey-100 text-grey-400'
                  }`}
                >
                  {done ? <Check size={11} /> : stepNum}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    active ? 'text-grey-800' : done ? 'text-primary' : 'text-grey-400'
                  }`}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <ChevronRight size={12} className="text-grey-300" />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-grey-400">Step {step} of {TOTAL_STEPS}</p>
      </div>

      <div className="p-6">
        {/* STEP 1 — Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">
                Competition name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Office Olympics 2025"
                maxLength={60}
                className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">
                Description <span className="text-grey-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe your competition…"
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-right text-xs text-grey-400">{form.description.length}/500</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">Visibility</label>
              <div className="flex items-center gap-3">
                {[{ label: 'Public', val: true }, { label: 'Private', val: false }].map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => update('is_public', val)}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      form.is_public === val
                        ? 'border-primary bg-primary-muted text-primary'
                        : 'border-grey-200 text-grey-600 hover:border-grey-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-grey-400">
                {form.is_public
                  ? 'Anyone can find and join this competition from the Discover page.'
                  : 'Only people with the invite link or code can join.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-grey-700">Country</label>
                <select
                  value={form.country_code}
                  onChange={(e) => update('country_code', e.target.value)}
                  className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select country</option>
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
                  placeholder="e.g. Dublin"
                  className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">
                Suggested contribution per player (€){' '}
                <span className="text-grey-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.prize_pot_per_person}
                onChange={(e) => update('prize_pot_per_person', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* STEP 2 — Event Selection */}
        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-grey-600">
              Select the events for your competition.
            </p>
            {errors.selectedEventIds && (
              <p className="mb-3 text-sm text-red-500">{errors.selectedEventIds}</p>
            )}
            <div className="mb-5 max-h-96 space-y-4 overflow-y-auto rounded-lg border border-grey-100 p-4">
              {Object.entries(eventsByCategory).map(([category, catEvents]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-grey-400">{category}</h3>
                  <div className="space-y-1">
                    {catEvents.map((event) => {
                      const selected = form.selectedEventIds.includes(event.id);
                      return (
                        <label
                          key={event.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                            selected ? 'bg-primary-muted' : 'hover:bg-grey-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleEvent(event.id)}
                            className="accent-primary"
                          />
                          <span className="text-sm text-grey-800">{event.name}</span>
                          <span className="ml-auto text-xs text-grey-400">{event.result_type}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {form.selectedEventIds.length > 0 && (
              <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
                <p className="mb-3 text-sm font-semibold text-grey-700">
                  {form.selectedEventIds.length} event{form.selectedEventIds.length !== 1 ? 's' : ''} selected
                </p>
                <label className="mb-1 block text-sm font-semibold text-grey-700">
                  Minimum events each competitor must complete
                </label>
                <input
                  type="number"
                  min={1}
                  max={form.selectedEventIds.length}
                  value={form.min_events_required}
                  onChange={(e) =>
                    update('min_events_required', Math.min(form.selectedEventIds.length, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-24 rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Weighting */}
        {step === 3 && (
          <div>
            <div className="mb-5 space-y-3 rounded-lg border border-grey-200 bg-grey-50 p-4">
              {[
                { key: 'mvp_voting_enabled' as const, label: 'Enable MVP voting', sub: 'Winner gets +1 bonus point' },
                { key: 'worst_performer_enabled' as const, label: 'Enable worst performer voting', sub: 'Last place gets -1 point penalty' },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-grey-800">{label}</p>
                    <p className="text-xs text-grey-500">{sub}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update(key, !form[key])}
                    className={`relative h-6 w-11 rounded-full transition-colors ${form[key] ? 'bg-primary' : 'bg-grey-300'}`}
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
            <div className="space-y-3">
              {form.selectedEventIds.map((eventId) => {
                const event = events.find((e) => e.id === eventId);
                if (!event) return null;
                const weight = form.eventWeights[eventId] ?? { weight_tag: 'standard', weight_multiplier: 1.0 };
                const isCustom = weight.weight_tag === 'custom';
                return (
                  <div key={eventId} className="rounded-lg border border-grey-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-grey-800">{event.name}</span>
                      <span className="text-xs text-grey-400">1st = {(10 * weight.weight_multiplier).toFixed(1)} pts</span>
                    </div>
                    <select
                      value={weight.weight_tag}
                      onChange={(e) => {
                        const option = WEIGHT_OPTIONS.find((o) => o.tag === e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          eventWeights: {
                            ...prev.eventWeights,
                            [eventId]: { weight_tag: e.target.value as WeightTag, weight_multiplier: option?.multiplier ?? 1.0 },
                          },
                        }));
                      }}
                      className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-700 focus:border-primary focus:outline-none"
                    >
                      {WEIGHT_OPTIONS.map((o) => (
                        <option key={o.tag} value={o.tag}>{o.label}</option>
                      ))}
                    </select>
                    {isCustom && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-grey-500">Custom multiplier:</label>
                        <input
                          type="number"
                          min={0.1} max={3.0} step={0.1}
                          value={weight.weight_multiplier}
                          onChange={(e) => {
                            const val = Math.min(3.0, Math.max(0.1, parseFloat(e.target.value) || 0.1));
                            setForm((prev) => ({
                              ...prev,
                              eventWeights: {
                                ...prev.eventWeights,
                                [eventId]: { weight_tag: prev.eventWeights[eventId]?.weight_tag ?? 'custom', weight_multiplier: val },
                              },
                            }));
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
          </div>
        )}

        {/* STEP 4 — Members */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-sm text-grey-600">
              Add the people competing. You can add anyone you follow or create a guest profile for someone without an account.
            </p>

            {/* Added members list */}
            {form.members.length > 0 && (
              <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-grey-500">
                  {form.members.length} member{form.members.length !== 1 ? 's' : ''} added
                </p>
                <div className="space-y-1.5">
                  {form.members.map((m) => (
                    <div key={m.tempId} className="flex items-center gap-2.5 rounded-md bg-white px-3 py-2 border border-grey-100">
                      {m.avatarUrl ? (
                        <Image src={m.avatarUrl} alt={m.displayName} width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grey-200 text-xs font-bold text-grey-500">
                          {m.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-medium text-grey-900">{m.displayName}</span>
                      {m.type === 'ghost' && (
                        <span className="rounded-full bg-grey-100 px-1.5 py-0.5 text-xs text-grey-500">Guest</span>
                      )}
                      <button type="button" onClick={() => removeMember(m.tempId)} className="text-grey-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add from follows */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-grey-800">
                <UserPlus size={15} />
                Add from people you follow
              </h3>
              {followsLoading ? (
                <p className="text-sm text-grey-400">Loading…</p>
              ) : (following ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed border-grey-200 p-4 text-center text-sm text-grey-400">
                  You&apos;re not following anyone yet.
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-grey-200 p-2">
                  {(following ?? []).map((profile) => {
                    const alreadyAdded = addedFollowIds.has(profile.id);
                    return (
                      <div key={profile.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                        {profile.avatar_url ? (
                          <Image src={profile.avatar_url} alt={profile.display_name} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grey-200 text-xs font-bold text-grey-500">
                            {profile.display_name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="flex-1 text-sm text-grey-800">{profile.display_name}</span>
                        <button
                          type="button"
                          onClick={() => addFollowMember(profile)}
                          disabled={alreadyAdded}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            alreadyAdded
                              ? 'bg-grey-100 text-grey-400'
                              : 'bg-primary text-white hover:bg-primary-dark'
                          }`}
                        >
                          {alreadyAdded ? 'Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ghost profile */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-grey-800">
                <Ghost size={15} />
                Add a guest (no account needed)
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ghostNameInput}
                  onChange={(e) => setGhostNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGhostMember(); } }}
                  placeholder="Guest display name"
                  maxLength={30}
                  className="flex-1 rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addGhostMember}
                  disabled={ghostNameInput.trim().length < 2}
                  className="rounded-lg bg-grey-100 px-4 py-2 text-sm font-semibold text-grey-700 hover:bg-grey-200 disabled:opacity-50"
                >
                  Add Guest
                </button>
              </div>
              <p className="mt-1.5 text-xs text-grey-400">
                Guest profiles appear on the leaderboard and can be claimed later if the person registers.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5 — Assign members to events */}
        {step === 5 && (
          <div className="space-y-5">
            {form.members.length === 0 ? (
              <div className="rounded-lg border border-dashed border-grey-200 p-8 text-center">
                <p className="text-sm text-grey-500">No members added yet - skip this step or go back to add members.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-grey-600">
                  Choose which members compete in each event. You can adjust this when you start each event.
                </p>
                <div className="space-y-4">
                  {form.selectedEventIds.map((eventLibraryId) => {
                    const event = events.find((e) => e.id === eventLibraryId);
                    if (!event) return null;
                    const assigned = form.eventAssignments[eventLibraryId] ?? [];
                    const allAssigned = assigned.length === form.members.length;

                    return (
                      <div key={eventLibraryId} className="rounded-lg border border-grey-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-grey-900">{event.name}</h3>
                            <p className="text-xs text-grey-500 capitalize">{event.event_categories?.name} · {event.result_type}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => clearEventAssignment(eventLibraryId)}
                              className="text-xs text-grey-400 hover:text-grey-700"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => assignAllToEvent(eventLibraryId)}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              {allAssigned ? 'All assigned' : 'Assign all'}
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {form.members.map((member) => {
                            const isAssigned = assigned.includes(member.tempId);
                            return (
                              <button
                                key={member.tempId}
                                type="button"
                                onClick={() => toggleEventAssignment(eventLibraryId, member.tempId)}
                                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                                  isAssigned
                                    ? 'border-primary bg-primary/5'
                                    : 'border-grey-200 hover:border-grey-300'
                                }`}
                              >
                                {member.avatarUrl ? (
                                  <Image src={member.avatarUrl} alt={member.displayName} width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grey-200 text-xs font-bold text-grey-500">
                                    {member.displayName[0]?.toUpperCase()}
                                  </div>
                                )}
                                <span className="flex-1 truncate text-sm font-medium text-grey-900">{member.displayName}</span>
                                <div className={`h-4 w-4 shrink-0 rounded border-2 ${isAssigned ? 'border-primary bg-primary' : 'border-grey-300'}`}>
                                  {isAssigned && (
                                    <svg viewBox="0 0 12 12" fill="none" className="h-full w-full">
                                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <p className="mt-2 text-xs text-grey-400">
                          {assigned.length} of {form.members.length} assigned
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 6 — Review & Invite */}
        {step === 6 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-lg border border-grey-100 bg-grey-50 p-4">
              <div className="flex items-start gap-3">
                <Trophy size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-grey-800">{form.name || 'Your competition'}</p>
                  <p className="text-xs text-grey-500">
                    {form.selectedEventIds.length} event{form.selectedEventIds.length !== 1 ? 's' : ''} ·{' '}
                    {form.members.length} member{form.members.length !== 1 ? 's' : ''} added ·{' '}
                    {form.is_public ? 'Public' : 'Private'} ·{' '}
                    Best {form.min_events_required} results count
                  </p>
                </div>
              </div>
            </div>

            {/* Invite link preview */}
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-grey-400">Invite link (available after creation)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded border border-grey-200 bg-white px-3 py-2 text-xs text-grey-600">
                  {previewInviteLink}
                </code>
                <button
                  type="button"
                  onClick={() => toast.error('Link will be available after the competition is created')}
                  className="rounded border border-grey-200 bg-white p-2 text-grey-500 hover:text-grey-700"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Email invites */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">
                Invite more by email <span className="text-grey-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                  placeholder="teammate@example.com"
                  className="flex-1 rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="rounded-lg bg-grey-100 px-4 py-2.5 text-sm font-semibold text-grey-700 hover:bg-grey-200"
                >
                  Add
                </button>
              </div>
              {form.inviteEmails.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.inviteEmails.map((email) => (
                    <span key={email} className="flex items-center gap-1.5 rounded-full bg-primary-muted px-3 py-1 text-xs font-semibold text-primary">
                      {email}
                      <button type="button" onClick={() => removeEmail(email)} className="text-primary hover:text-primary-dark">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-grey-100 px-6 py-4">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {step === 4 && form.members.length === 0 ? 'Skip' : 'Next'}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create Competition'}
          </button>
        )}
      </div>
    </div>
  );
}
