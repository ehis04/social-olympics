import type { ProfileSummary } from '@repo/types';

export interface AvatarProps {
  profile: ProfileSummary;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showFlag?: boolean;
  onPress?: () => void;
}
