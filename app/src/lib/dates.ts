// Day keys are 'YYYY-MM-DD' in the phone's local time.
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// The last `count` days, oldest first, each as [start, end) with today's end capped at now.
export function lastDays(count: number, now = new Date()): { day: string; start: Date; end: Date }[] {
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i));
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return { day: dayKey(start), start, end: next > now ? now : next };
  });
}

export const emptyHours = () => Array<number>(24).fill(0);
