import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from '../components/LoginPage';
import { AuthProvider } from '../contexts/AuthProvider';

// Mock dependencies that LoginPage needs
vi.mock('@/contexts/AppContext', () => ({
  useAuth: () => ({ signIn: vi.fn(), user: null }),
}));

describe('LoginPage', () => {
  it('renders login text properly', () => {
    render(<LoginPage />);
    expect(screen.getByText(/sign in to sync/i)).toBeDefined();
  });
});
