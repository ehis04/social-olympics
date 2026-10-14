import Link from 'next/link';
import type { CompetitionHistoryEntry } from '@repo/supabase';
import ROUTES from '@/constants/routes';

export function CompetitionHistory({ history }: { history: CompetitionHistoryEntry[] }) {
  return (
    <section className="space-y-3" aria-labelledby="competition-history-heading">
      <h2 id="competition-history-heading" className="text-base font-semibold text-grey-900">Competition history</h2>
      {history.length === 0 ? <p className="text-sm text-grey-500">No competitions to show yet.</p> : (
        <div className="divide-y divide-grey-100 overflow-hidden rounded-lg border border-grey-200 bg-white">
          {history.map((entry) => {
            const competition = entry.competitions;
            const finished = ['complete', 'archived'].includes(competition.status);
            return (
              <Link key={competition.id} className="block space-y-1 p-4 hover:bg-grey-50"
                href={finished ? ROUTES.COMPETITION_PODIUM(competition.id) : ROUTES.COMPETITION_EVENTS(competition.id)}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-grey-900">{competition.name}</span>
                  <span className="text-xs capitalize text-grey-500">{finished ? 'Completed' : competition.status}</span>
                </div>
                <p className="text-sm text-grey-600">
                  {finished && entry.final_rank ? `Final place #${entry.final_rank} · ` : ''}
                  {Number(entry.total_points).toFixed(1)} points · {entry.events_completed}/{competition.total_events} events
                </p>
                <p className="text-xs text-grey-500">🥇 {entry.gold_count} · 🥈 {entry.silver_count} · 🥉 {entry.bronze_count}</p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
