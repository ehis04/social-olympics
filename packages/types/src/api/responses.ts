// Standardised API response envelope types.

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  cursor?: string;
  has_more: boolean;
}
