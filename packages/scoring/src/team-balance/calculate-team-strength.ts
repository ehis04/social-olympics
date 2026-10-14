/*
 * This file defines the calculate team strength module.
 */

// Sums all strength ratings for a team.
export function calculateTeamStrength(ratings: number[]): number {
  return ratings.reduce((sum, r) => sum + r, 0);
}
