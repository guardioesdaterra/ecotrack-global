import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for conditional class names
 * Merges multiple class value arrays into a single classes string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 