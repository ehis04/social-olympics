// Public API for the supabase package.

// Clients
export { createBrowserClient } from './client/browser';
export { createServerClient } from './client/server';
export { createAdminClient } from './client/admin';
export { createMiddlewareClient } from './client/middleware';
export type { CookieStore } from './client/server';

// Competition queries
export { getCompetition } from './queries/competitions/get-competition';
export { getCompetitionByInviteCode } from './queries/competitions/get-competition-by-invite-code';
export { getCompetitionMembers } from './queries/competitions/get-competition-members';
export { getPublicCompetitions } from './queries/competitions/get-public-competitions';
export { getUserCompetitions } from './queries/competitions/get-user-competitions';

// Event queries
export { getCompetitionEvent } from './queries/events/get-competition-event';
export { getCompetitionEvents } from './queries/events/get-competition-events';
export { getEventsLibrary } from './queries/events/get-events-library';

// Result queries
export { getResultsForEvent } from './queries/results/get-results-for-event';
export { getResultsForMember } from './queries/results/get-results-for-member';
export { getWeightliftingBids } from './queries/results/get-weightlifting-bids';

// Leaderboard queries
export { getLeaderboard } from './queries/leaderboard/get-leaderboard';
export { getTeamLeaderboard } from './queries/leaderboard/get-team-leaderboard';

// Social queries
export { getFeed } from './queries/social/get-feed';
export { getGroupChat } from './queries/social/get-group-chat';
export { getDirectMessages } from './queries/social/get-direct-messages';
export { getConversations } from './queries/social/get-conversations';
export { getNotifications } from './queries/social/get-notifications';

// User queries
export { getProfile } from './queries/users/get-profile';
export { getProfileByDisplayName } from './queries/users/get-profile-by-display-name';
export { getPersonalBests } from './queries/users/get-personal-bests';

// Moderation queries
export { getReports } from './queries/moderation/get-reports';

// Competition mutations
export { createCompetition } from './mutations/competitions/create-competition';
export { updateCompetition } from './mutations/competitions/update-competition';
export { addMember } from './mutations/competitions/add-member';
export { updateMemberRole } from './mutations/competitions/update-member-role';
export { createGhostProfile } from './mutations/competitions/create-ghost-profile';
export { completeCompetition } from './mutations/competitions/complete-competition';

// Event mutations
export { addCompetitionEvent } from './mutations/events/add-competition-event';
export { updateCompetitionEvent } from './mutations/events/update-competition-event';
export { removeCompetitionEvent } from './mutations/events/remove-competition-event';
export { reorderEvents } from './mutations/events/reorder-events';
export { startEvent } from './mutations/events/start-event';
export { createCustomEvent } from './mutations/events/create-custom-event';

// Result mutations
export { submitResult } from './mutations/results/submit-result';
export { confirmResult } from './mutations/results/confirm-result';
export { raiseDispute } from './mutations/results/raise-dispute';
export { resolveDispute } from './mutations/results/resolve-dispute';
export { submitWeightliftingBid } from './mutations/results/submit-weightlifting-bid';
export { processBidRound } from './mutations/results/process-bid-round';
export type { ConfirmResultPayload } from './mutations/results/confirm-result';

// Social mutations
export { sendMessage } from './mutations/social/send-message';
export { deleteMessage } from './mutations/social/delete-message';
export { addReaction } from './mutations/social/add-reaction';
export { removeReaction } from './mutations/social/remove-reaction';
export { addFeedComment } from './mutations/social/add-feed-comment';
export { submitStrengthVote } from './mutations/social/submit-strength-vote';
export { submitPerformanceVote } from './mutations/social/submit-performance-vote';
export { submitTiebreakerNomination } from './mutations/social/submit-tiebreaker-nomination';
export { markNotificationsRead } from './mutations/social/mark-notifications-read';
export { registerPushToken } from './mutations/social/register-push-token';
export type { StrengthVoteResult } from './mutations/social/submit-strength-vote';

// User mutations
export { createProfile } from './mutations/users/create-profile';
export { updateProfile } from './mutations/users/update-profile';
export { uploadAvatar } from './mutations/users/upload-avatar';
export { claimGhostProfile } from './mutations/users/claim-ghost-profile';

// Moderation mutations
export { createReport } from './mutations/moderation/create-report';
export { resolveReport } from './mutations/moderation/resolve-report';

// Realtime subscriptions
export { subscribeLeaderboard } from './realtime/leaderboard/subscribe-leaderboard';
export { subscribeFeed } from './realtime/feed/subscribe-feed';
export { subscribeGroupChat } from './realtime/chat/subscribe-group-chat';
export { subscribeDirectMessages } from './realtime/chat/subscribe-direct-messages';
