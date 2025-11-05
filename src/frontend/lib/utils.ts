import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format relative time with seconds precision
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) {
    return 'just now';
  } else if (diffSec < 60) {
    return `${diffSec} seconds ago`;
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  }
}

/**
 * Format duration (e.g., "2m 30s")
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get score color class based on value
 */
export function getScoreColor(score: number): string {
  if (score > 70) return 'text-success';
  if (score >= 50) return 'text-yellow-500';
  return 'text-error';
}

/**
 * Get score background class based on value
 */
export function getScoreBgColor(score: number): string {
  if (score > 70) return 'bg-success';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-error';
}

