/*
 * This file defines the loading module.
 */

// Competition feed loading skeleton
import { SkeletonFeedItem } from '@/components/ui/Skeletons';

// Renders the feed loading component.
export default function FeedLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonFeedItem key={i} />
      ))}
    </div>
  );
}
