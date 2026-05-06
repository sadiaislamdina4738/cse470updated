import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Navbar from '../Navbar';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn()
}));

const renderWithProviders = (component, authValue = {}) => {
  const mockUseAuth = require('../../contexts/AuthContext').useAuth;
  mockUseAuth.mockReturnValue(authValue);

  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  it('renders EventEase brand', () => {
    renderWithProviders(<Navbar />, { isAuthenticated: false });
    expect(screen.getByText('EventEase')).toBeInTheDocument();
  });

  it('shows login and register links when not authenticated', () => {
    renderWithProviders(<Navbar />, { isAuthenticated: false });
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('shows user menu when authenticated', () => {
    renderWithProviders(<Navbar />, { 
      isAuthenticated: true, 
      user: { username: 'testuser' },
      logout: jest.fn()
    });
    expect(screen.getByText('Create Event')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithProviders(<Navbar />, { isAuthenticated: false });
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });
});
