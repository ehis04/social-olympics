// Competition chat loading skeleton
import { SkeletonAvatar, SkeletonLine } from '@/components/ui/Skeletons';

function ChatBubbleSkeleton({ self }: { self?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${self ? 'flex-row-reverse' : ''}`}>
      {!self && <SkeletonAvatar size={8} />}
      <div className={`space-y-1 ${self ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`h-10 animate-pulse rounded-2xl bg-grey-200 ${self ? 'w-48' : 'w-56'}`}
        />
        <SkeletonLine width="16" height={3} />
      </div>
    </div>
  );
}

export default function ChatLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4">
        <ChatBubbleSkeleton />
        <ChatBubbleSkeleton self />
        <ChatBubbleSkeleton />
        <ChatBubbleSkeleton />
        <ChatBubbleSkeleton self />
        <ChatBubbleSkeleton />
      </div>
      <div className="border-t border-grey-200 p-3">
        <div className="h-11 w-full animate-pulse rounded-lg bg-grey-200" />
      </div>
    </div>
  );
}
