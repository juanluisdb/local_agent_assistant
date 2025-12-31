import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and merges Tailwind classes intelligently.
 * Standard pattern used by shadcn/ui components.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
