// Smoke tests for CreateCompetitionForm — step 1 rendering and validation
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateCompetitionForm from '@/components/competition/CreateCompetitionForm';

// next/navigation mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe('CreateCompetitionForm', () => {
  it('renders step 1 without errors', () => {
    render(<CreateCompetitionForm events={[]} currentUserId="test-user-id" />);
    expect(screen.getByText('Info')).toBeDefined();
    expect(screen.getByPlaceholderText(/Office Olympics/i)).toBeDefined();
  });

  it('Next button is disabled when name field is empty', () => {
    render(<CreateCompetitionForm events={[]} currentUserId="test-user-id" />);
    const nextBtn = screen.getByRole('button', { name: /next/i });
    // Name is empty by default — clicking Next should show an error, not advance
    fireEvent.click(nextBtn);
    expect(screen.getByText(/at least 3 characters/i)).toBeDefined();
  });

  it('shows error when name is fewer than 3 characters', () => {
    render(<CreateCompetitionForm events={[]} currentUserId="test-user-id" />);
    const nameInput = screen.getByPlaceholderText(/Office Olympics/i);
    fireEvent.change(nameInput, { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/at least 3 characters/i)).toBeDefined();
  });
});
