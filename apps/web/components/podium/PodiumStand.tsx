// PodiumStand — animated podium block with place number and height variation
'use client';

import { useEffect, useState } from 'react';

interface Props {
  place: 1 | 2 | 3;
  children: React.ReactNode;
}

const HEIGHTS: Record<1 | 2 | 3, string> = {
  1: 'h-28',
  2: 'h-20',
  3: 'h-14',
};

const COLOURS: Record<1 | 2 | 3, string> = {
  1: 'bg-amber-400 border-amber-500',
  2: 'bg-slate-300 border-slate-400',
  3: 'bg-orange-300 border-orange-400',
};

const LABEL_COLOURS: Record<1 | 2 | 3, string> = {
  1: 'text-amber-900',
  2: 'text-slate-700',
  3: 'text-orange-900',
};

const ORDER: Record<1 | 2 | 3, string> = {
  1: 'order-2',
  2: 'order-1',
  3: 'order-3',
};

const DELAYS: Record<1 | 2 | 3, string> = {
  1: 'delay-300',
  2: 'delay-150',
  3: 'delay-500',
};

export function PodiumStand({ place, children }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`flex flex-col items-center ${ORDER[place]}`}>
      <div
        className={[
          'mb-2 transition-all duration-700',
          DELAYS[place],
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        ].join(' ')}
      >
        {children}
      </div>

      <div
        className={[
          'flex w-28 items-end justify-center rounded-t-lg border-t-2 border-x-2 transition-all duration-700',
          HEIGHTS[place],
          COLOURS[place],
          DELAYS[place],
          visible ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
        ].join(' ')}
        style={{ transformOrigin: 'bottom' }}
      >
        <span className={`mb-2 text-2xl font-black ${LABEL_COLOURS[place]}`}>{place}</span>
      </div>
    </div>
  );
}
