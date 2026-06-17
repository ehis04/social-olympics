// Competition podium loading skeleton
import { SkeletonAvatar, SkeletonLine } from '@/components/ui/Skeletons';

function PodiumCardSkeleton({ height }: { height: string }) {
  return (
    <div className={`flex flex-col items-center justify-end gap-2 rounded-t-lg bg-grey-100 px-6 pb-4 pt-6 ${height}`}>
      <SkeletonAvatar size={16} />
      <SkeletonLine width="24" height={4} />
      <SkeletonLine width="16" height={4} />
    </div>
  );
}

export default function PodiumLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-1.5 text-center">
        <SkeletonLine width="48" height={7} />
        <SkeletonLine width="32" height={4} />
      </div>

      {/* Podium stand */}
      <div className="flex items-end justify-center gap-2">
        <PodiumCardSkeleton height="h-44" />
        <PodiumCardSkeleton height="h-56" />
        <PodiumCardSkeleton height="h-36" />
      </div>

      {/* Rest of finishers */}
      <div className="space-y-2">
        <SkeletonLine width="32" height={4} />
        <div className="overflow-hidden rounded-lg border border-grey-200 bg-white">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-grey-100 px-4 py-3 last:border-0">
              <SkeletonLine width="8" height={4} />
              <SkeletonAvatar size={8} />
              <SkeletonLine width="1/3" height={4} />
              <div className="ml-auto">
                <SkeletonLine width="20" height={4} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
