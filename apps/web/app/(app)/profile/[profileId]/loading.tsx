// Profile page loading skeleton
import { SkeletonAvatar, SkeletonLine, SkeletonCard } from '@/components/ui/Skeletons';

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Profile header skeleton */}
      <div className="rounded-lg border border-grey-200 bg-white p-6">
        <div className="flex items-start gap-5">
          <SkeletonAvatar size={20} />
          <div className="flex-1 space-y-3">
            <SkeletonLine width="1/3" height={6} />
            <SkeletonLine width="1/4" height={4} />
            <SkeletonLine width="1/2" height={4} />
          </div>
        </div>
        {/* Career stats row */}
        <div className="mt-6 grid grid-cols-4 gap-4 border-t border-grey-100 pt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5 text-center">
              <SkeletonLine width="full" height={6} />
              <SkeletonLine width="full" height={3} />
            </div>
          ))}
        </div>
      </div>

      {/* Personal bests heading */}
      <div className="flex items-center justify-between">
        <SkeletonLine width="40" height={5} />
        <SkeletonLine width="24" height={8} />
      </div>

      {/* Personal bests list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
    </div>
  );
}
