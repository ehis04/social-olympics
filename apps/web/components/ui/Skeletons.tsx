// Skeleton primitives — reusable pulse placeholders for loading states

export function SkeletonLine({ width = 'full', height = 4 }: { width?: string; height?: number }) {
  const w = width === 'full' ? 'w-full' : `w-${width}`;
  const h = `h-${height}`;
  return <div className={`${w} ${h} animate-pulse rounded bg-grey-200`} />;
}

export function SkeletonAvatar({ size = 10 }: { size?: number }) {
  return <div className={`h-${size} w-${size} shrink-0 animate-pulse rounded-full bg-grey-200`} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 space-y-3">
      <SkeletonLine width="2/3" height={5} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? 'full' : '3/4'} height={4} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <SkeletonLine width="8" height={4} />
      <SkeletonAvatar size={8} />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine width="1/3" height={4} />
        <SkeletonLine width="1/4" height={3} />
      </div>
      <SkeletonLine width="16" height={4} />
    </div>
  );
}

export function SkeletonFeedItem() {
  return (
    <div className="rounded-lg border border-grey-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={9} />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="2/3" height={4} />
          <SkeletonLine width="1/4" height={3} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-grey-100">
      <td className="px-4 py-3"><SkeletonLine width="6" height={4} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size={8} />
          <SkeletonLine width="32" height={4} />
        </div>
      </td>
      <td className="px-4 py-3 text-right"><SkeletonLine width="12" height={4} /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><SkeletonLine width="8" height={4} /></td>
      <td className="px-4 py-3 hidden md:table-cell"><SkeletonLine width="20" height={4} /></td>
    </tr>
  );
}
