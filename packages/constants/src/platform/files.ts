// Accepted file types and URL validation for uploads and evidence links.

export const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png'] as const;
export const EVIDENCE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export const EVIDENCE_URL_PATTERN = /^https?:\/\/.+/;
