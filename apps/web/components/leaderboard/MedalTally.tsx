// MedalTally — inline medal count display for leaderboard rows
interface Props {
  gold: number;
  silver: number;
  bronze: number;
}

export function MedalTally({ gold, silver, bronze }: Props) {
  if (gold === 0 && silver === 0 && bronze === 0) return null;

  return (
    <span className="flex items-center gap-2 text-sm">
      {gold > 0 && (
        <span className="flex items-center gap-0.5 font-medium" style={{ color: '#C9A84C' }}>
          🥇<span className="text-grey-700">{gold}</span>
        </span>
      )}
      {silver > 0 && (
        <span className="flex items-center gap-0.5 font-medium" style={{ color: '#9BA4B4' }}>
          🥈<span className="text-grey-700">{silver}</span>
        </span>
      )}
      {bronze > 0 && (
        <span className="flex items-center gap-0.5 font-medium" style={{ color: '#CD7F32' }}>
          🥉<span className="text-grey-700">{bronze}</span>
        </span>
      )}
    </span>
  );
}