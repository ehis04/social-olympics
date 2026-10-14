import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedItemCard } from '@/components/feed/FeedItemCard';
import { isFeedItem, type FeedItem } from '@/types/social';
vi.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ user: null }) }));
const item: FeedItem = {
  id: 'feed-1', competition_id: 'competition-1', event_type: 'result_confirmed',
  actor_profile_id: null, subject_profile_id: null,
  metadata: { event_name: '100m sprint' }, created_at: new Date().toISOString(),
  actor: null, subject: null,
};
describe('competition feed database records', () => {
  it('renders the database event_type with event metadata', () => {
    render(<FeedItemCard item={item} />);
    expect(screen.getByText('confirmed a result in 100m sprint')).toBeDefined();
  });
  it('accepts realtime database records and rejects missing event types', () => {
    expect(isFeedItem(item)).toBe(true);
    expect(isFeedItem({ id: 'bad', event_type: undefined })).toBe(false);
    expect(isFeedItem({ id: 'old', activity_type: 'result_confirmed' })).toBe(false);
  });
});
