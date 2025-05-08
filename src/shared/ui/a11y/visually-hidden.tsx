import React from 'react';

type VisuallyHiddenProps = {
  children: React.ReactNode;
  as?: React.ElementType;
};

/**
 * Visually hides content while keeping it accessible to screen readers.
 * 
 * @example
 * <VisuallyHidden>
 *   This text is visually hidden but still announced by screen readers
 * </VisuallyHidden>
 * 
 * @example
 * <VisuallyHidden as="h2">Section heading that's only for screen readers</VisuallyHidden>
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  ...props
}: VisuallyHiddenProps & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component
      className="sr-only"
      {...props}
    >
      {children}
    </Component>
  );
}

export default VisuallyHidden; 