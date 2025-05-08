'use client';

import React from 'react';
import { cn } from '../../lib/utils/cn';

type SkipLinkProps = {
  href: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Skip link for keyboard navigation accessibility.
 * Visible only when focused, allows keyboard users to skip navigation.
 * 
 * @example
 * <SkipLink href="#main-content">Skip to main content</SkipLink>
 */
export function SkipLink({
  href,
  children = 'Skip to content',
  className,
  ...props
}: SkipLinkProps & React.HTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export default SkipLink; 