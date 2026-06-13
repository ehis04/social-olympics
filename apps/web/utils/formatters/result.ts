export function formatResultValue(value: number, resultType: string): string {
  switch (resultType) {
    case 'time': {
      const totalMs = value;
      const mins = Math.floor(totalMs / 60000);
      const secs = (totalMs % 60000) / 1000;
      if (mins === 0) return `${secs.toFixed(2)}s`;
      return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
    }
    case 'distance':
      return `${(value / 100).toFixed(2)}m`;
    case 'score':
      return `${value}`;
    case 'inverted_score':
      return `${value}`;
    case 'weight':
      return `${value.toFixed(2)}kg`;
    case 'compound':
      return `${value} reps`;
    case 'possession':
      return `${value} pts`;
    default:
      return `${value}`;
  }
}
