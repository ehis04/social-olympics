export interface TimerProps {
  mode: 'stopwatch' | 'countdown';
  initialMs?: number;
  onCapture?: (ms: number) => void;
  autoStart?: boolean;
}
