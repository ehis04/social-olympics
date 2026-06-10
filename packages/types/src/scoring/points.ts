// Points calculation types.

export interface PointsConfig {
  finishing_place: number;
  points_value: number;
}

export interface WeightedPoints {
  base_points: number;
  multiplier: number;
  final_points: number;
}

export interface EventPointsBreakdown {
  competition_event_id: string;
  profile_id: string;
  weighted_points: WeightedPoints;
  bonus_points: number;
  total_event_points: number;
}
