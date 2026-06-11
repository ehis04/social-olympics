// Unit tests for resolveByMargin — head-to-head margin comparison.
import { describe, expect, it } from 'vitest';
import { resolveByMargin } from '../../src/tiebreakers/resolve-by-margin';

// score-based (higher = better), time-based (lower = better)
function makeNomination(
  profileId: string,
  myResult: number,
  opponentResult: number,
  resultType = 'score',
) {
  return { profileId, nominatedEventId: `event-${profileId}`, resultValuePrimary: myResult,
           opponentResultValuePrimary: opponentResult, resultType };
}

describe('resolveByMargin', () => {
  it('A wins both events → A wins', () => {
    const nomA = makeNomination('a', 10, 5);   // A scored 10, opponent 5 — A wins
    const nomB = makeNomination('b', 3, 8);    // B scored 3, opponent 8 — B loses
    expect(resolveByMargin(nomA, nomB)).toBe('a');
  });

  it('B wins both events → B wins', () => {
    const nomA = makeNomination('a', 4, 9);    // A loses event A
    const nomB = makeNomination('b', 10, 6);   // B wins event B
    expect(resolveByMargin(nomA, nomB)).toBe('b');
  });

  it('1-1: A wins event A by 8, B wins event B by 1 → A wins (larger margin)', () => {
    const nomA = makeNomination('a', 10, 2);   // margin 8
    const nomB = makeNomination('b', 6, 5);    // margin 1
    expect(resolveByMargin(nomA, nomB)).toBe('a');
  });

  it('1-1: B wins event A by 5, A wins event B by 3 → B wins', () => {
    const nomA = makeNomination('a', 5, 3);    // A wins event A by 2... wait, need B to win event A
    // Re-framing: nomA is A's nomination — A's result vs B in that event
    // For B to "win event A": B's result in A's event is better
    // nomA: profileId='a', myResult=3, opponentResult=8 → B wins (8>3 for score)
    // nomB: profileId='b', myResult=10, opponentResult=7 → B wins event B by 3
    const nomA2 = makeNomination('a', 3, 8);   // B wins event A, margin 5
    const nomB2 = makeNomination('b', 10, 7);  // B wins event B, margin 3... but nomB is B's nomination so B should win
    // Actually: nomB is B's nominated event. B wins it means B's result > opponent (A)
    // So nomB2: B=10, A=7. B wins event B by margin 3.
    // nomA2: A=3, B=8. B wins event A by margin 5. But A nominated event A — so it's 0-2 for B
    // Let's restructure: A wins event B (A's nomination), B wins event A (B's nomination) = 1-1
    const nomAWin = makeNomination('a', 10, 7);  // A wins event A (A nominated), margin 3
    const nomBWin = makeNomination('b', 12, 7);  // B wins event B (B nominated), margin 5
    expect(resolveByMargin(nomAWin, nomBWin)).toBe('b');
  });

  it('equal margins → null (host decides)', () => {
    const nomA = makeNomination('a', 10, 5);   // margin 5
    const nomB = makeNomination('b', 10, 5);   // margin 5
    expect(resolveByMargin(nomA, nomB)).toBeNull();
  });

  it('time-based event (lowerIsBetter): lower result wins', () => {
    const nomA = makeNomination('a', 10000, 12000, 'time'); // A=10s, B=12s, A wins (faster)
    const nomB = makeNomination('b', 11000, 13000, 'time'); // B=11s, A=13s, B wins
    // 1-1: marginA=2000, marginB=2000 → null
    expect(resolveByMargin(nomA, nomB)).toBeNull();
  });

  it('time-based: A wins by larger margin takes it', () => {
    const nomA = makeNomination('a', 9000, 15000, 'time');  // margin 6000 — A wins
    const nomB = makeNomination('b', 10000, 11000, 'time'); // margin 1000 — B wins
    expect(resolveByMargin(nomA, nomB)).toBe('a');
  });

  it('score-based event: higher value wins', () => {
    const nomA = makeNomination('a', 15, 10, 'score'); // A wins by 5
    const nomB = makeNomination('b', 8, 6, 'score');   // B wins by 2
    expect(resolveByMargin(nomA, nomB)).toBe('a');
  });
});
