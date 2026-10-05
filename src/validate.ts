import type { AppData, AssessmentRecord, DayRecord, MedicationRecord, Profile, VisitPrep } from "./types";
import { CONDITIONS } from "./types";
import { isValidDate } from "./dates";
import { emptyPrep } from "./defaults";

const TRI = ["yes", "no", "unknown"];
const TRI_U = [...TRI, "unset"];
const IMPACT = ["none", "reduced", "stop_some", "unable"];
const PURPOSE = ["acute", "preventive", "other", "unknown"];
const RECOVERY = ["full", "partial", "none", "unknown"];

type Errs = string[];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const inEnum = (v: unknown, list: string[]) => isStr(v) && list.includes(v);
const intIn = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const numIn = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

// ---------- 量表分数 ----------
export const SCALE_RANGE = { MIDAS: [0, 270], HIT6: [36, 78] } as const;

export function validateScaleScore(type: "MIDAS" | "HIT6", raw: string): { ok: true; score: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "") return { ok: false, error: "请填写总分。" };
  if (!/^\d+$/.test(t)) return { ok: false, error: "总分必须是整数。" };
  const n = Number(t);
  const [lo, hi] = SCALE_RANGE[type];
  if (n < lo || n > hi) return { ok: false, error: `${type === "HIT6" ? "HIT-6" : "MIDAS"} 总分应在 ${lo}–${hi} 之间。` };
  return { ok: true, score: n };
}

// ---------- 每日记录 ----------
export function validateDayForSave(d: DayRecord, today: string): Errs {
  const e: Errs = [];
  if (!isValidDate(d.date)) e.push("日期无效。");
  else if (d.date > today) e.push("不能记录未来日期。");
  if (!inEnum(d.headache, TRI)) e.push("请选择是否头痛。");
  if (d.headache === "yes" && d.maxPain === null) e.push("有头痛时请选择当日最严重疼痛程度（0–10）。");
  if (d.maxPain !== null && !intIn(d.maxPain, 0, 10)) e.push("疼痛程度应为 0–10 的整数。");
  if (d.durationHours !== null && !numIn(d.durationHours, 0, 24)) e.push("头痛时长应在 0–24 小时之间。");
  if (d.notes.length > 1000) e.push("备注最多 1000 字。");
  d.medications.forEach((m, i) => {
    if (!m.name.trim()) e.push(`第 ${i + 1} 条用药缺少药名。`);
    if (m.painAt2h !== null && !intIn(m.painAt2h, 0, 10)) e.push(`第 ${i + 1} 条用药的 2 小时疼痛程度应为 0–10。`);
  });
  return e;
}

// ---------- 导入校验 ----------
function checkProfile(p: unknown, e: Errs): p is Profile {
  if (!isObj(p)) return e.push("缺少基础资料 profile。"), false;
  if (!(p.age === null || intIn(p.age, 1, 120))) e.push("年龄超出范围。");
  for (const k of ["diagnosed", "tryingToConceive", "pregnant", "breastfeeding"]) if (!inEnum(p[k], TRI_U)) e.push(`基础资料 ${k} 取值无效。`);
  if (!isStrArr(p.conditions) || !p.conditions.every((c) => (CONDITIONS as readonly string[]).includes(c))) e.push("已知疾病取值无效。");
  for (const k of ["onset", "conditionsOther", "allergies", "longTermMeds", "pastMigraineMeds"]) if (!isStr(p[k])) e.push(`基础资料 ${k} 应为文本。`);
  if (!(p.savedAt === null || isStr(p.savedAt))) e.push("基础资料 savedAt 无效。");
  return true;
}
function checkPrep(p: unknown, e: Errs) {
  if (p === undefined) return;
  if (!isObj(p)) return void e.push("就诊前整理表格式无效。");
  for (const k of ["lifeImpact", "acuteUnsatisfied"]) if (!inEnum(p[k], TRI_U)) e.push(`整理表 ${k} 取值无效。`);
  for (const k of ["mainConcern", "treatmentGoal", "ownQuestions"]) if (!isStr(p[k])) e.push(`整理表 ${k} 应为文本。`);
}
function checkMed(m: unknown, where: string, e: Errs) {
  if (!isObj(m)) return void e.push(`${where} 用药格式无效。`);
  const med = m as unknown as MedicationRecord;
  if (!isStr(med.id) || !isStr(med.name) || !med.name.trim()) e.push(`${where} 用药缺少药名或 id。`);
  if (!inEnum(med.purpose, PURPOSE)) e.push(`${where} 用药目的无效。`);
  if (!isStr(med.category) || !isStr(med.actualDose) || !isStr(med.adverseEffects)) e.push(`${where} 用药文本字段无效。`);
  if (!(med.takenAt === null || isStr(med.takenAt))) e.push(`${where} 服药时间无效。`);
  if (!(med.painAt2h === null || intIn(med.painAt2h, 0, 10))) e.push(`${where} 2 小时疼痛程度超出 0–10。`);
  if (!inEnum(med.activityRecovery, RECOVERY)) e.push(`${where} 恢复情况无效。`);
  if (!inEnum(med.recurrence, TRI)) e.push(`${where} 再次头痛取值无效。`);
}
function checkDay(d: unknown, i: number, e: Errs) {
  const w = `第 ${i + 1} 条每日记录`;
  if (!isObj(d)) return void e.push(`${w} 格式无效。`);
  if (!isStr(d.id)) e.push(`${w} 缺少 id。`);
  if (!isValidDate(d.date)) e.push(`${w} 日期无效。`);
  if (!inEnum(d.headache, TRI)) e.push(`${w} 是否头痛取值无效。`);
  if (!(d.maxPain === null || intIn(d.maxPain, 0, 10))) e.push(`${w} 疼痛程度超出 0–10。`);
  if (d.headache === "yes" && d.maxPain === null) e.push(`${w} 有头痛但缺少疼痛程度。`);
  if (!(d.activityImpact === null || inEnum(d.activityImpact, IMPACT))) e.push(`${w} 活动影响取值无效。`);
  if (!(d.durationHours === null || numIn(d.durationHours, 0, 24))) e.push(`${w} 时长超出 0–24。`);
  for (const k of ["continuesPreviousDay", "aura", "menstruation"]) if (!inEnum(d[k], TRI)) e.push(`${w} ${k} 取值无效。`);
  if (!isStrArr(d.symptoms) || !isStrArr(d.possibleFactors)) e.push(`${w} 多选字段无效。`);
  if (!isStr(d.auraDescription) || !isStr(d.notes) || !isStr(d.updatedAt)) e.push(`${w} 文本字段无效。`);
  if (isStr(d.notes) && d.notes.length > 1000) e.push(`${w} 备注超过 1000 字。`);
  if (!Array.isArray(d.medications)) e.push(`${w} 用药列表无效。`);
  else d.medications.forEach((m) => checkMed(m, w, e));
}
function checkAssessment(a: unknown, i: number, e: Errs) {
  const w = `第 ${i + 1} 条量表结果`;
  if (!isObj(a)) return void e.push(`${w} 格式无效。`);
  const r = a as unknown as AssessmentRecord;
  if (!isStr(r.id)) e.push(`${w} 缺少 id。`);
  if (r.type !== "MIDAS" && r.type !== "HIT6") return void e.push(`${w} 类型无效。`);
  if (!isValidDate(r.completedOn)) e.push(`${w} 填写日期无效。`);
  if (!(r.periodStart === null || isValidDate(r.periodStart)) || !(r.periodEnd === null || isValidDate(r.periodEnd))) e.push(`${w} 回顾区间日期无效。`);
  const [lo, hi] = SCALE_RANGE[r.type];
  if (!intIn(r.score, lo, hi)) e.push(`${w} 分数超出 ${lo}–${hi}。`);
  if (!isStr(r.versionOrSource)) e.push(`${w} 版本／来源应为文本。`);
}

export type ImportCheck =
  | { ok: true; data: AppData; counts: { days: number; medications: number; assessments: number } }
  | { ok: false; errors: string[] };

export function validateAppData(raw: unknown): ImportCheck {
  const e: Errs = [];
  if (!isObj(raw)) return { ok: false, errors: ["文件不是有效的备份对象。"] };
  if (raw.schemaVersion !== 1) e.push("不支持的数据版本（需要 schemaVersion: 1）。");
  checkProfile(raw.profile, e);
  checkPrep(raw.prep, e);
  if (!Array.isArray(raw.days)) e.push("缺少每日记录 days 列表。");
  else {
    raw.days.forEach((d, i) => checkDay(d, i, e));
    const dates = raw.days.map((d) => (isObj(d) ? d.date : null));
    if (new Set(dates).size !== dates.length) e.push("存在重复日期的每日记录。");
  }
  if (!Array.isArray(raw.assessments)) e.push("缺少量表结果 assessments 列表。");
  else raw.assessments.forEach((a, i) => checkAssessment(a, i, e));
  if (e.length) return { ok: false, errors: e.slice(0, 20) };
  const data = { ...(raw as unknown as AppData), prep: (raw.prep as VisitPrep | undefined) ?? emptyPrep() };
  if (!isStr(data.updatedAt)) data.updatedAt = new Date().toISOString();
  return {
    ok: true,
    data,
    counts: {
      days: data.days.length,
      medications: data.days.reduce((n, d) => n + d.medications.length, 0),
      assessments: data.assessments.length,
    },
  };
}
