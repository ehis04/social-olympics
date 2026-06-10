import type { ProfileSummary } from '@repo/types';

export interface PodiumProps {
  entries: Array<{ profile: ProfileSummary; place: 1 | 2 | 3 }>;
  onProfilePress?: (profileId: string) => void;
}
