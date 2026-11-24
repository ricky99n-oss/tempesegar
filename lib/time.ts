export function seoulInput(value: string | null) {
  if (!value) return '';
  const d = new Date(Date.parse(value) + 9 * 3600000);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
}
export function seoulUTC(value: string) {
  if (!value) return null;
  const d = new Date(`${value}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
