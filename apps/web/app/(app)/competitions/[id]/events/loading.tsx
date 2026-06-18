// Competition events loading skeleton
import { SkeletonLine, SkeletonRow } from '@/components/ui/Skeletons';

export default function EventsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <SkeletonLine width="32" height={7} />
          <SkeletonLine width="48" height={4} />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-grey-200 bg-white">
        <ul className="divide-y divide-grey-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i}>
              <SkeletonRow />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
