export function formatUsageMinutes(totalMinutes: number): string {
  const mins = Math.round(totalMinutes);
  if (!mins) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
