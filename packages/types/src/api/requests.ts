// Common API request parameter types.

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface SearchParams {
  q?: string;
}

export type CompetitionSearchParams = PaginationParams &
  SearchParams & {
    country_code?: string;
    city?: string;
    category_slug?: string;
  };

export interface DateRangeParams {
  from?: string;
  to?: string;
}
