import { format, formatDistance, parseISO, compareDesc } from 'date-fns';

/**
 * Format a date as "dd MMM yyyy" (e.g., "31 Oct 2025")
 */
export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
};

/**
 * Format a date with time as "dd MMM yyyy HH:mm" (e.g., "31 Oct 2025 14:30")
 */
export const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy HH:mm');
};

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export const formatRelative = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(d, new Date(), { addSuffix: true });
};

/**
 * Sort items by createdAt date in descending order (newest first)
 */
export const sortByDateDesc = <T extends { createdAt: Date | string }>(
    items: T[]
): T[] => {
    return [...items].sort((a, b) => {
        const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt) : a.createdAt;
        const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt) : b.createdAt;
        return compareDesc(dateA, dateB);
    });
};

/**
 * Get current timestamp as Date object
 */
export const now = (): Date => new Date();

/**
 * Get ISO string for current timestamp
 */
export const nowISO = (): string => new Date().toISOString();
