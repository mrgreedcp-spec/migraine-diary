/**
 * 统计与提示规则（固定、可审查）。
 * 这里只做计数和固定文案，不做诊断、不推荐具体药物或剂量。
 */
import type { AppData, AssessmentRecord, DayRecord, MedicationRecord } from "./types";
import { daysBetweenInclusive, monthRange } from "./dates";

export interface MonthStats {
  start: string;
  end: string;
  /** 截至今天应记录的最后一天（未来月份时为 null） */
  expectedEnd: string | null;
  expectedDays: number;
  recordedDays: number;
  complete: boolean;
  headacheDays: number;
  noHeadacheDays: number;
  unknownDays: number;
  /** 需要停止部分活动或基本无法正常活动 */
  impactedDays: number;
  reducedEfficiencyDays: number;
  acuteMedDays: number;
  acuteDaysByCategory: { category: string; days: number }[];
  unknownPurposeMeds: { date: string; med: MedicationRecord }[];
  preventiveMedNames: string[];
  avgPain: number | null;
  painSampleDays: number;
}

export function daysInRange(days: DayRecord[], start: string, end: string) {
  return days.filter((d) => d.date >= start && d.date <= end);
}

export function computeMonthStats(days: DayRecord[], year: number, month: number, today: string): MonthStats {
  const { start, end } = monthRange(year, month);
  const expectedEnd = today < start ? null : today < end ? today : end;
  const expectedDays = expectedEnd ? daysBetweenInclusive(start, expectedEnd) : 0;
  // 每个日期只取一条（数据层已保证同日唯一，这里再防御一次）
  const byDate = new Map<string, DayRecord>();
  for (const d of daysInRange(days, start, expectedEnd ?? end)) byDate.set(d.date, d);
  const recs = [...byDate.values()];

  const acuteDays = recs.filter((d) => d.medications.some((m) => m.purpose === "acute"));
  const catMap = new Map<string, number>();
  for (const d of acuteDays) {
    const cats = new Set(d.medications.filter((m) => m.purpose === "acute").map((m) => m.category || "不确定"));
    cats.forEach((c) => catMap.set(c, (catMap.get(c) ?? 0) + 1));
  }
  const pains = recs.filter((d) => d.headache === "yes" && d.maxPain !== null).map((d) => d.maxPain as number);

  return {
    start,
    end,
    expectedEnd,
    expectedDays,
    recordedDays: recs.length,
    complete: expectedDays > 0 && recs.length >= expectedDays,
    headacheDays: recs.filter((d) => d.headache === "yes").length,
    noHeadacheDays: recs.filter((d) => d.headache === "no").length,
    unknownDays: recs.filter((d) => d.headache === "unknown").length,
    impactedDays: recs.filter((d) => d.activityImpact === "stop_some" || d.activityImpact === "unable").length,
    reducedEfficiencyDays: recs.filter((d) => d.activityImpact === "reduced").length,
    acuteMedDays: acuteDays.length,
    acuteDaysByCategory: [...catMap.entries()].map(([category, days]) => ({ category, days })),
    unknownPurposeMeds: recs.flatMap((d) => d.medications.filter((m) => m.purpose === "unknown").map((med) => ({ date: d.date, med }))),
    preventiveMedNames: [...new Set(recs.flatMap((d) => d.medications.filter((m) => m.purpose === "preventive").map((m) => m.name.trim())))],
    avgPain: pains.length ? Math.round((pains.reduce((a, b) => a + b, 0) / pains.length) * 10) / 10 : null,
    painSampleDays: pains.length,
  };
}

export type DayStatus = "yes" | "no" | "unknown" | "missing" | "future";
export function dayStatus(days: DayRecord[], date: string, today: string): DayStatus {
  if (date > today) return "future";
  const r = days.find((d) => d.date === date);
  return r ? r.headache : "missing";
}

// ---------- 量表分级（影响程度，不映射药物） ----------
export function midasGrade(score: number): string {
  if (score <= 5) return "生活功能影响很小或没有（0–5）";
  if (score <= 10) return "轻度（6–10）";
  if (score <= 20) return "中度（11–20）";
  return "重度（≥21）";
}
export function hit6Grade(score: number): string {
  if (score <= 49) return "影响很小或没有（≤49）";
  if (score <= 55) return "有一定影响（50–55）";
  if (score <= 59) return "影响较大（56–59）";
  return "影响严重（≥60）";
}
export function gradeOf(a: AssessmentRecord) {
  return a.type === "MIDAS" ? midasGrade(a.score) : hit6Grade(a.score);
}
export function latestAssessment(list: AssessmentRecord[], type: "MIDAS" | "HIT6"): AssessmentRecord | null {
  const xs = list.filter((a) => a.type === type).sort((a, b) => b.completedOn.localeCompare(a.completedOn));
  return xs[0] ?? null;
}

// ---------- 预防治疗沟通提示（6.2） ----------
export function monthsWithAtLeast4HeadacheDays(days: DayRecord[]): string[] {
  const m = new Map<string, number>();
  for (const d of days) if (d.headache === "yes") m.set(d.date.slice(0, 7), (m.get(d.date.slice(0, 7)) ?? 0) + 1);
  return [...m.entries()].filter(([, n]) => n >= 4).map(([k]) => k).sort();
}
export function preventionDiscussionReasons(data: AppData): string[] {
  const r: string[] = [];
  const months = monthsWithAtLeast4HeadacheDays(data.days);
  if (months.length) r.push(`已有自然月记录到至少 4 个头痛日（${months.join("、")}）。`);
  if (data.prep.lifeImpact === "yes") r.push("本人在整理表中表示头痛明显影响生活。");
  if (data.prep.acuteUnsatisfied === "yes") r.push("本人在整理表中表示对当前急性期治疗效果不满意。");
  return r;
}

// ---------- 用药频率沟通问题（6.3） ----------
export function medFrequencyQuestion(acuteMedDays: number): string {
  return `这个月记录的急性期用药为 ${acuteMedDays} 天，请与医生确认使用频率及是否需要调整整体治疗方案。`;
}

export const STANDARD_QUESTIONS = [
  "目前的急性期药物、剂型和服药时机是否合适？",
  "是否需要预防治疗？",
  "备孕、其他疾病或长期用药会限制哪些选择？",
  "治疗后多久复评，用哪些指标判断有效？",
];

export const EMERGENCY_MESSAGE = "这些症状需要及时就医。请优先联系当地急救服务或前往急诊，不要等待完成记录。";
export const DISCLAIMER = "用于记录和就诊准备，具体诊断与用药请与医生确认。";
