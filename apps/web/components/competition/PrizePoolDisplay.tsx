// Informational prize pot display; only renders when prize_pot_per_person is set
interface Props {
  prizePerPerson: number;
  memberCount: number;
}

export default function PrizePoolDisplay({ prizePerPerson, memberCount }: Props) {
  const total = prizePerPerson * memberCount;
  const first = total * 0.5;
  const second = total * 0.3;
  const third = total * 0.2;

  function fmt(n: number) {
    return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-grey-400">Prize Pot</p>
      <p className="mb-2 text-sm text-grey-700">
        €{fmt(prizePerPerson)} per competitor - total pot{' '}
        <span className="font-bold text-grey-800">€{fmt(total)}</span>
      </p>
      <div className="flex gap-4 text-sm">
        <span>
          <span className="mr-1">🥇</span>1st - €{fmt(first)}
        </span>
        <span>
          <span className="mr-1">🥈</span>2nd - €{fmt(second)}
        </span>
        <span>
          <span className="mr-1">🥉</span>3rd - €{fmt(third)}
        </span>
      </div>
      <p className="mt-2 text-xs text-grey-400">
        Prize pot is informational only. Social Olympics does not process or hold payments.
        Arrange payments separately.
      </p>
    </div>
  );
}
