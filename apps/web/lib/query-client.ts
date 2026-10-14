/*
 * This file defines the query client module.
 */

import { QueryClient } from '@tanstack/react-query';

let client: QueryClient | null = null;

// Handles get query client.
export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return client;
}
