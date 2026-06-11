// Scales a team's strength to a standard size for fair comparison when team sizes differ.
export function scaleUnevenTeam(
  teamStrength: number,
  actualSize: number,
  standardSize: number,
): number {
  if (actualSize === standardSize) return teamStrength;
  return (teamStrength / (actualSize * 10)) * (standardSize * 10);
}
