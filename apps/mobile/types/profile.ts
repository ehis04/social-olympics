import type { Database } from '@repo/types';

export type ProfileWithStats = Database['public']['Tables']['profiles']['Row'] & {
  career_stats?: Database['public']['Tables']['career_stats']['Row'] | null;
};

export type PersonalBest = Database['public']['Tables']['personal_bests']['Row'] & {
  events: {
    name: string;
    result_type: Database['public']['Enums']['result_type'];
    event_categories: { name: string } | null;
  } | null;
};
