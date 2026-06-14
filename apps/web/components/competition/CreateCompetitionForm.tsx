'use client';

// 4-step competition creation form; manages all step state in a single object
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Copy, Trophy } from 'lucide-react';
import ROUTES from '@/constants/routes';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventWithCategory = EventRow & {
  event_categories?: { name: string; slug: string } | null;
};

type WeightTag = 'not_important' | 'standard' | 'important' | 'very_important' | 'custom';

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
}

const WEIGHT_OPTIONS: { label: string; tag: WeightTag; multiplier: number }[] = [
  { label: 'Not Important (0.5×)', tag: 'not_important', multiplier: 0.5 },
  { label: 'Standard (1×)', tag: 'standard', multiplier: 1.0 },
  { label: 'Important (1.5×)', tag: 'important', multiplier: 1.5 },
  { label: 'Very Important (2×)', tag: 'very_important', multiplier: 2.0 },
  { label: 'Custom', tag: 'custom', multiplier: 1.0 },
];

const STEP_LABELS = ['Basic Info', 'Events', 'Weighting', 'Invite'];

interface Props {
  events: EventWithCategory[];
}

export default function CreateCompetitionForm({ events }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  // Group events by category
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

    const newMin = Math.max(1, Math.ceil(newSelected.length * 0.6));

    setForm((prev) => ({
      ...prev,
      selectedEventIds: newSelected,
      eventWeights: newWeights,
      min_events_required: Math.min(prev.min_events_required, newSelected.length || 1),
    }));
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3)
      errs.name = 'Name must be at least 3 characters';
    if (form.name.trim().length > 60)
      errs.name = 'Name must be 60 characters or fewer';
    if (form.description.length > 500)
      errs.description = 'Description must be 500 characters or fewer';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    if (form.selectedEventIds.length === 0) {
      setErrors({ selectedEventIds: 'Select at least one event' });
      return false;
    }
    if (form.min_events_required > form.selectedEventIds.length) {
      setErrors({ min_events_required: 'Cannot exceed total selected events' });
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
    if (!email || form.inviteEmails.includes(email)) return;
    update('inviteEmails', [...form.inviteEmails, email]);
    setEmailInput('');
  }

  function removeEmail(email: string) {
    update('inviteEmails', form.inviteEmails.filter((e) => e !== email));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
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
        min_events_required: form.min_events_required,
        mvp_voting_enabled: form.mvp_voting_enabled,
        worst_performer_enabled: form.worst_performer_enabled,
        selectedEventIds: form.selectedEventIds,
        eventWeights: form.eventWeights,
        inviteEmails: form.inviteEmails,
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

  return (
    <div className="rounded-lg border border-grey-200 bg-white shadow-sm">
      {/* Step indicator */}
      <div className="border-b border-grey-100 px-6 py-4">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const done = stepNum < step;
            const active = stepNum === step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? 'bg-primary text-white'
                      : active
                      ? 'bg-primary text-white'
                      : 'bg-grey-100 text-grey-400'
                  }`}
                >
                  {done ? <Check size={13} /> : stepNum}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    active ? 'text-grey-800' : done ? 'text-primary' : 'text-grey-400'
                  }`}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <ChevronRight size={16} className="text-grey-300" />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-grey-400">Step {step} of {STEP_LABELS.length}</p>
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
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">Visibility</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => update('is_public', true)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
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
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    !form.is_public
                      ? 'border-primary bg-primary-muted text-primary'
                      : 'border-grey-200 text-grey-600 hover:border-grey-300'
                  }`}
                >
                  Private
                </button>
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
                Suggested contribution per player (£){' '}
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
              <p className="mt-1 text-xs text-grey-400">
                Informational only — the platform does not process payments.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2 — Event Selection */}
        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-grey-600">
              Select the events for your competition. You can choose from the full event library below.
            </p>
            {errors.selectedEventIds && (
              <p className="mb-3 text-sm text-red-500">{errors.selectedEventIds}</p>
            )}

            <div className="mb-5 space-y-4 max-h-96 overflow-y-auto rounded-lg border border-grey-100 p-4">
              {Object.entries(eventsByCategory).map(([category, catEvents]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-grey-400">
                    {category}
                  </h3>
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
                    update(
                      'min_events_required',
                      Math.min(
                        form.selectedEventIds.length,
                        Math.max(1, parseInt(e.target.value) || 1),
                      ),
                    )
                  }
                  className="w-24 rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1.5 text-xs text-grey-400">
                  Competitors&apos; best {form.min_events_required} result
                  {form.min_events_required !== 1 ? 's' : ''} will count toward their total.
                </p>
                {errors.min_events_required && (
                  <p className="mt-1 text-xs text-red-500">{errors.min_events_required}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Weighting */}
        {step === 3 && (
          <div>
            <div className="mb-5 space-y-3 rounded-lg border border-grey-200 bg-grey-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-grey-800">Enable MVP voting</p>
                  <p className="text-xs text-grey-500">Winner gets +1 bonus point</p>
                </div>
                <button
                  type="button"
                  onClick={() => update('mvp_voting_enabled', !form.mvp_voting_enabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    form.mvp_voting_enabled ? 'bg-primary' : 'bg-grey-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.mvp_voting_enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-grey-800">Enable worst performer voting</p>
                  <p className="text-xs text-grey-500">Last place gets -1 point penalty</p>
                </div>
                <button
                  type="button"
                  onClick={() => update('worst_performer_enabled', !form.worst_performer_enabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    form.worst_performer_enabled ? 'bg-primary' : 'bg-grey-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.worst_performer_enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-grey-400">
                These settings lock once the first event starts.
              </p>
            </div>

            <div className="space-y-3">
              {form.selectedEventIds.map((eventId) => {
                const event = events.find((e) => e.id === eventId);
                if (!event) return null;
                const weight = form.eventWeights[eventId] ?? { weight_tag: 'standard', weight_multiplier: 1.0 };
                const isCustom = weight.weight_tag === 'custom';
                const firstPlacePoints = (10 * weight.weight_multiplier).toFixed(1);

                return (
                  <div key={eventId} className="rounded-lg border border-grey-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-grey-800">{event.name}</span>
                      <span className="text-xs text-grey-400">1st = {firstPlacePoints} pts</span>
                    </div>
                    <select
                      value={weight.weight_tag}
                      onChange={(e) => {
                        const option = WEIGHT_OPTIONS.find((o) => o.tag === e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          eventWeights: {
                            ...prev.eventWeights,
                            [eventId]: {
                              weight_tag: e.target.value as WeightTag,
                              weight_multiplier: option?.multiplier ?? 1.0,
                            },
                          },
                        }));
                      }}
                      className="mb-2 w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-700 focus:border-primary focus:outline-none"
                    >
                      {WEIGHT_OPTIONS.map((o) => (
                        <option key={o.tag} value={o.tag}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {isCustom && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-grey-500">Custom multiplier:</label>
                        <input
                          type="number"
                          min={0.1}
                          max={3.0}
                          step={0.1}
                          value={weight.weight_multiplier}
                          onChange={(e) => {
                            const val = Math.min(3.0, Math.max(0.1, parseFloat(e.target.value) || 0.1));
                            setForm((prev) => ({
                              ...prev,
                              eventWeights: {
                            ...prev.eventWeights,
                                [eventId]: {
                                  weight_tag: prev.eventWeights[eventId]?.weight_tag ?? 'custom',
                                  weight_multiplier: val,
                                },
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

        {/* STEP 4 — Invite */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-grey-400">
                Invite link (available after creation)
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-3 py-2 text-xs text-grey-600 border border-grey-200">
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
              <p className="mt-1.5 text-xs text-grey-400">
                Invite code: <span className="font-mono font-bold">{previewInviteCode}</span>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-grey-700">
                Invite by email <span className="text-grey-400 font-normal">(optional)</span>
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
                  className="rounded-lg bg-grey-100 px-4 py-2.5 text-sm font-semibold text-grey-700 hover:bg-grey-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {form.inviteEmails.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.inviteEmails.map((email) => (
                    <span
                      key={email}
                      className="flex items-center gap-1.5 rounded-full bg-primary-muted px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-primary hover:text-primary-dark"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-grey-400">
                You can also invite members after the competition is created.
              </p>
            </div>

            <div className="rounded-lg border border-grey-100 bg-grey-50 p-4">
              <div className="flex items-start gap-3">
                <Trophy size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-grey-800">
                    {form.name || 'Your competition'}
                  </p>
                  <p className="text-xs text-grey-500">
                    {form.selectedEventIds.length} event{form.selectedEventIds.length !== 1 ? 's' : ''} •{' '}
                    {form.is_public ? 'Public' : 'Private'} •{' '}
                    Best {form.min_events_required} results count
                  </p>
                </div>
              </div>
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
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Creating…' : 'Create Competition'}
          </button>
        )}
      </div>
    </div>
  );
}
