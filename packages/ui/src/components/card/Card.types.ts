import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}
