// Competition leaderboard loading skeleton
import { SkeletonTableRow, SkeletonLine } from '@/components/ui/Skeletons';

export default function LeaderboardLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine width="40" height={6} />
        <div className="flex rounded-lg border border-grey-200 p-0.5 gap-1">
          <div className="h-8 w-24 animate-pulse rounded-md bg-grey-200" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-grey-100" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-grey-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-grey-200 bg-grey-50">
              <th className="px-4 py-3 w-12" />
              <th className="px-4 py-3" />
              <th className="px-4 py-3" />
              <th className="px-4 py-3 hidden sm:table-cell" />
              <th className="px-4 py-3 hidden md:table-cell" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
