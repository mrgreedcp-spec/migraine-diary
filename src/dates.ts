// 全部按本地日历日期处理，不经过 UTC 转换
const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayLocal(): string {
  return toLocalDate(new Date());
}
export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}
export function monthRange(year: number, month: number) {
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  };
}
/** 两个日期之间（含两端）的天数；end < start 返回 0 */
export function daysBetweenInclusive(start: string, end: string): number {
  if (end < start) return 0;
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000) + 1;
}
export function shiftMonth(year: number, month: number, delta: number) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
export function formatCn(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
