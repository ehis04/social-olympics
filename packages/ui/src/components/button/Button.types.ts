import type { ReactNode } from 'react';

export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}
