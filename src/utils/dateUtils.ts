import type { UnixTimestamp } from '../types/common';

export function nowTimestamp(): UnixTimestamp {
  return Date.now();
}

export function formatDate(ts: UnixTimestamp): string {
  return new Date(ts).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(ts: UnixTimestamp): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return formatDate(ts);
}
