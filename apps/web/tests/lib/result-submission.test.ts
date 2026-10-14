import { describe, expect, it } from 'vitest';
import { ResultSubmissionSchema } from '@/lib/results/submit-schema';
const eventId = '40000000-0000-0000-0000-000000000020';

describe('result submission API contract', () => {
  it('accepts both web and mobile result value fields', () => {
    for (const valueField of ['result_value', 'result_value_primary']) {
      expect(ResultSubmissionSchema.parse({ competition_event_id: eventId, [valueField]: 12.5 }).result_value).toBe(12.5);
    }
  });
  it('accepts DNF without a numeric value', () => {
    expect(ResultSubmissionSchema.parse({ competition_event_id: eventId, is_dnf: true }).result_value).toBeNull();
  });
  it.each([undefined, -1, Infinity, '12'])('rejects missing or invalid non-DNF values: %s', (value) => {
    expect(ResultSubmissionSchema.safeParse({ competition_event_id: eventId, result_value: value }).success).toBe(false);
  });
});
