/*
 * This file holds the keyword filter used for user-written text.
 */

const BLOCKED_KEYWORDS = [
  'fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'retard',
  'kike', 'spic', 'chink', 'whore', 'bitch', 'asshole', 'bastard',
];

export const BLOCKED_CONTENT_MESSAGE =
  'Your text contains language that is not permitted on this platform.';

// Returns true when the text contains a blocked keyword.
export function containsBlockedKeyword(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((keyword) => lower.includes(keyword));
}
