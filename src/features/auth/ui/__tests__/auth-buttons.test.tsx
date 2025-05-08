import { render, screen, fireEvent } from '@testing-library/react'
import { AuthButtons } from '../auth-buttons'
import * as authContext from '../../lib/auth-context'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/utils/supabase/index', () => ({
  createBrowserSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
          count: 5
        }))
      }))
    }))
  }))
}))

describe('AuthButtons', () => {
  // Setup common mocks
  const mockRouter = { push: jest.fn() }
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(authContext, 'useAuth').mockImplementation()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  test('renders loading state', () => {
    // Mock auth context in loading state
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    })

    render(<AuthButtons />)
    
    expect(screen.getByText('Authenticating')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  test('renders sign in button when user is not authenticated', () => {
    // Mock auth context when not signed in
    const mockSignIn = jest.fn()
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signInWithGoogle: mockSignIn,
      signOut: jest.fn(),
    })

    render(<AuthButtons />)
    
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    expect(signInButton).toBeInTheDocument()
    
    // Test sign in behavior
    fireEvent.click(signInButton)
    expect(mockSignIn).toHaveBeenCalledTimes(1)
  })

  test('renders user dropdown when authenticated', () => {
    // Mock auth context with signed in user
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      } as any,
      session: {} as any,
      isLoading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    })

    render(<AuthButtons />)
    
    // User initial should be visible (first letter of name)
    expect(screen.getByText('T')).toBeInTheDocument()
    
    // Click to open dropdown
    fireEvent.click(screen.getByText('T'))
    
    // Check dropdown content
    expect(screen.getByText('Signed in as')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  test('signs out when sign out button is clicked', () => {
    // Mock auth context with signed in user
    const mockSignOut = jest.fn()
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      } as any,
      session: {} as any,
      isLoading: false,
      signInWithGoogle: jest.fn(),
      signOut: mockSignOut,
    })

    render(<AuthButtons />)
    
    // Open dropdown
    fireEvent.click(screen.getByText('T'))
    
    // Click sign out button
    fireEvent.click(screen.getByText('Sign Out'))
    
    // Verify sign out was called
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
}) 