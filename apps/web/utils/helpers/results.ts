export function getPlaceSuffix(place: number): string {
  const mod100 = place % 100;
  const mod10 = place % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  if (mod10 === 1) return `${place}st`;
  if (mod10 === 2) return `${place}nd`;
  if (mod10 === 3) return `${place}rd`;
  return `${place}th`;
}

export function canSubmitResult(memberRole: string, eventStatus: string): boolean {
  const eligibleRoles = ['competitor', 'cohost', 'host'];
  return eligibleRoles.includes(memberRole) && eventStatus === 'active';
}
