// Dashboard loading skeleton
import { SkeletonCard } from '@/components/ui/Skeletons';

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-grey-200" />
        <div className="h-9 w-40 animate-pulse rounded bg-grey-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
