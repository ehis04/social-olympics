/*
 * This file defines the index module.
 */

export const WEB_CONFIG = {
  SUPABASE_STORAGE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public',
  DEFAULT_AVATAR: '/images/default-avatar.png',
  // Address shown on the privacy and terms pages for data and support requests.
  CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'socialolympics.app@protonmail.com',
  LEGAL_LAST_UPDATED: '11 October 2026',
};
