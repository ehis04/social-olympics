// Competition members loading skeleton
import { SkeletonAvatar, SkeletonLine } from '@/components/ui/Skeletons';

export default function MembersLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SkeletonLine width="40" height={6} />
      </div>
      <div className="overflow-hidden rounded-lg border border-grey-200 bg-white">
        <ul className="divide-y divide-grey-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <SkeletonAvatar size={9} />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine width="1/4" height={4} />
                <SkeletonLine width="1/6" height={3} />
              </div>
              <SkeletonLine width="24" height={4} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
