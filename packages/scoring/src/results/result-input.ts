/*
 * This file converts between human-entered result values and stored result values.
 */

// Results are stored as integers for time (milliseconds) and distance (centimetres).
// People enter seconds ("11.40", "1:52.30") and metres ("6.32"), so every form uses these helpers.

export interface ResultInputConfig {
  label: string;
  placeholder: string;
  unit: string;
  inputMode: 'numeric' | 'decimal' | 'text';
  step?: string;
  help?: string;
}

// Returns true when a lower value is the better result.
export function isLowerBetter(resultType: string): boolean {
  return resultType === 'time' || resultType === 'inverted_score';
}

// Parses a human-entered value into the stored representation, or null when invalid.
export function parseResultInput(resultType: string, raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;

  if (resultType === 'time') {
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length > 3) return null;
      const numbers = parts.map((part) => Number(part));
      if (numbers.some((value) => !Number.isFinite(value) || value < 0)) return null;
      // Every part after the first must be a valid seconds/minutes component.
      if (numbers.slice(1).some((value) => value >= 60)) return null;
      const totalSeconds = numbers.reduce((total, value) => total * 60 + value, 0);
      return Math.round(totalSeconds * 1000);
    }
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return Math.round(seconds * 1000);
  }

  if (resultType === 'distance') {
    const metres = Number(trimmed);
    if (!Number.isFinite(metres) || metres < 0) return null;
    return Math.round(metres * 100);
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  if (resultType === 'weight') return Math.round(value * 100) / 100;
  return Number.isInteger(value) ? value : null;
}

// Formats a stored value back into the text a person would type.
export function formatResultForInput(resultType: string, stored: number | null | undefined): string {
  if (stored === null || stored === undefined || !Number.isFinite(stored)) return '';

  if (resultType === 'time') {
    const totalSeconds = stored / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    if (minutes === 0) return seconds.toFixed(2);
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }

  if (resultType === 'distance') return (stored / 100).toFixed(2);
  return String(stored);
}

// Returns the label, placeholder and unit for a result input.
export function getResultInputConfig(resultType: string): ResultInputConfig {
  switch (resultType) {
    case 'time':
      return {
        label: 'Time',
        placeholder: '11.40 or 1:52.30',
        unit: 'sec',
        inputMode: 'text',
        help: 'Enter seconds, or minutes and seconds such as 1:52.30.',
      };
    case 'distance':
      return {
        label: 'Distance',
        placeholder: '6.32',
        unit: 'm',
        inputMode: 'decimal',
        step: '0.01',
        help: 'Enter metres with up to two decimal places.',
      };
    case 'score':
      return { label: 'Score', placeholder: '0', unit: 'pts', inputMode: 'numeric', step: '1' };
    case 'inverted_score':
      return {
        label: 'Score',
        placeholder: '72',
        unit: 'strokes',
        inputMode: 'numeric',
        step: '1',
        help: 'Lower is better.',
      };
    case 'weight':
      return { label: 'Weight', placeholder: '100.0', unit: 'kg', inputMode: 'decimal', step: '0.5' };
    case 'compound':
      return { label: 'Reps', placeholder: '0', unit: 'reps', inputMode: 'numeric', step: '1' };
    case 'possession':
      return { label: 'Points', placeholder: '0', unit: 'pts', inputMode: 'numeric', step: '1' };
    default:
      return { label: 'Value', placeholder: '0', unit: '', inputMode: 'decimal' };
  }
}

// Formats a stored value for display, with its unit (11.40s, 1:52.30, 6.32m, 100.00kg).
export function formatResultValue(value: number, resultType: string): string {
  switch (resultType) {
    case 'time': {
      const minutes = Math.floor(value / 60000);
      const seconds = (value % 60000) / 1000;
      if (minutes === 0) return `${seconds.toFixed(2)}s`;
      return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
    }
    case 'distance':
      return `${(value / 100).toFixed(2)}m`;
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
