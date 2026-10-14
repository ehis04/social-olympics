/*
 * This file defines the page module.
 */

import { redirect } from 'next/navigation';

// Renders the root page component.
export default function RootPage() {
  redirect('/login');
}