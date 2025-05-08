'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './auth-context';

interface UseAuthGuardOptions {
  redirectTo?: string;
  redirectIfAuthed?: boolean;
  requiredRoles?: string[];
}

/**
 * A hook for protecting routes that require authentication.
 * Use this in any component or page that should be protected.
 * 
 * @example
 * // In a page component
 * export default function ProtectedPage() {
 *   const { loading } = useAuthGuard();
 *   
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *   
 *   return <div>Protected content</div>;
 * }
 * 
 * @example
 * // With custom options
 * useAuthGuard({
 *   redirectTo: '/login',
 *   requiredRoles: ['admin'],
 * });
 */
export function useAuthGuard({
  redirectTo = '/auth/login',
  redirectIfAuthed = false,
  requiredRoles = [],
}: UseAuthGuardOptions = {}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (isLoading) {
      return;
    }

    const hasRequiredRoles = requiredRoles.length === 0 || 
      requiredRoles.some(role => user?.user_metadata?.roles?.includes(role));
    
    // Handle authentication checks
    if (!redirectIfAuthed && !user) {
      // Required authentication but user is not logged in - redirect to login
      router.push(`${redirectTo}?returnUrl=${encodeURIComponent(pathname)}`);
    } else if (redirectIfAuthed && user) {
      // User is logged in but this page is only for non-authenticated users
      router.push('/');
    } else if (user && requiredRoles.length > 0 && !hasRequiredRoles) {
      // User doesn't have the required roles
      router.push('/unauthorized');
    } else {
      // Auth checks passed
      setLoading(false);
    }
  }, [user, isLoading, router, pathname, redirectTo, redirectIfAuthed, requiredRoles]);

  return {
    loading: isLoading || loading,
    user,
  };
}

export default useAuthGuard; 