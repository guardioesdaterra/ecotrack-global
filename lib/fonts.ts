import { Inter, Roboto_Mono } from 'next/font/google';

// Inter - Main font (Sans-serif)
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  fallback: ['system-ui', 'arial', 'sans-serif'],
  adjustFontFallback: true,
});

// Roboto Mono - Monospace font for code blocks, etc.
export const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '700'],
  variable: '--font-roboto-mono',
  fallback: ['monospace'],
  adjustFontFallback: true,
});

// Font variable mappings for CSS
export const fontVariables = {
  inter: inter.variable,
  robotoMono: robotoMono.variable,
};

/**
 * Combined font class string for use in layout
 */
export const fontClasses = `${inter.variable} ${robotoMono.variable}`;

/**
 * Font optimization notes:
 * - Self-hosted with next/font/google for improved performance
 * - Subsets to reduce file size
 * - Preload to improve FCP and LCP metrics
 * - Display 'swap' to prevent FOIT
 * - Limited weights to minimize bundle size
 * - CSS variable for easy theming
 * - System fallbacks for faster initial render
 */ 