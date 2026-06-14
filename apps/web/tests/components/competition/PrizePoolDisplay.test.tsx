// Tests for PrizePoolDisplay component
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrizePoolDisplay from '@/components/competition/PrizePoolDisplay';

describe('PrizePoolDisplay', () => {
  it('renders correctly when prize_pot_per_person is set', () => {
    render(<PrizePoolDisplay prizePerPerson={10} memberCount={5} />);
    expect(screen.getByText(/^Prize Pot$/i)).toBeDefined();
  });

  it('calculates the correct total from member count x per person', () => {
    render(<PrizePoolDisplay prizePerPerson={20} memberCount={5} />);
    expect(screen.getByText(/£100\.00/)).toBeDefined();
  });

  it('shows the correct 50/30/20 split amounts', () => {
    render(<PrizePoolDisplay prizePerPerson={100} memberCount={1} />);
    // total = 100, splits = 50 / 30 / 20
    expect(screen.getByText(/£50\.00/)).toBeDefined();
    expect(screen.getByText(/£30\.00/)).toBeDefined();
    expect(screen.getByText(/£20\.00/)).toBeDefined();
  });

  it('shows the disclaimer text', () => {
    render(<PrizePoolDisplay prizePerPerson={10} memberCount={3} />);
    expect(screen.getByText(/does not process or hold payments/i)).toBeDefined();
  });
});
