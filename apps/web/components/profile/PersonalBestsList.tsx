/*
 * This file defines the PersonalBestsList user-interface component.
 */

// PersonalBestsList — personal bests grouped by event category
import type { PersonalBest } from '@/types/profile';
import { formatResultValue } from '@repo/scoring';

interface Props {
  personalBests: PersonalBest[];
}

// Renders the personal bests list component.
export function PersonalBestsList({ personalBests }: Props) {
  if (personalBests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-8 text-center">
        <p className="text-sm text-grey-500">No personal bests recorded yet.</p>
      </div>
    );
  }

  const grouped = personalBests.reduce<Record<string, PersonalBest[]>>((acc, pb) => {
    const category = pb.events?.event_categories?.name ?? 'Other';
    const existing = acc[category] ?? [];
    existing.push(pb);
    acc[category] = existing;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, bests]) => (
        <div key={category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-grey-500">
            {category}
          </h3>
          <div className="overflow-hidden rounded-lg border border-grey-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-grey-100">
                {bests.map((pb) => (
                  <tr key={pb.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-grey-50">
                    <td className="font-medium text-grey-900">{pb.events?.name ?? '-'}</td>
                    <td className="font-mono text-grey-700">
                      {formatResultValue(pb.result_value_primary, pb.events?.result_type ?? 'score')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
