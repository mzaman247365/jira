// Format minutes to human-readable duration
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Parse human-readable duration to minutes
// Supports: "2h", "30m", "2h 30m", "1.5h", "90m", "1d" (8h day), "1w" (5d week)
export function parseDuration(input: string): number | null {
  if (!input || !input.trim()) return null;
  const str = input.trim().toLowerCase();

  let total = 0;
  let matched = false;

  // weeks
  const weekMatch = str.match(/(\d+(?:\.\d+)?)\s*w/);
  if (weekMatch) { total += parseFloat(weekMatch[1]) * 5 * 8 * 60; matched = true; }

  // days
  const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*d/);
  if (dayMatch) { total += parseFloat(dayMatch[1]) * 8 * 60; matched = true; }

  // hours
  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hourMatch) { total += parseFloat(hourMatch[1]) * 60; matched = true; }

  // minutes
  const minMatch = str.match(/(\d+(?:\.\d+)?)\s*m/);
  if (minMatch) { total += parseFloat(minMatch[1]); matched = true; }

  // plain number treated as minutes
  if (!matched && /^\d+$/.test(str)) {
    total = parseInt(str, 10);
    matched = true;
  }

  return matched ? Math.round(total) : null;
}
