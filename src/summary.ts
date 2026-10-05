/** 就诊摘要：只使用用户输入和明确计算结果，未填写显示“未提供” */
import type { AppData } from "./types";
import { RECOVERY_LABEL, RECURRENCE_LABEL, TRI_LABEL } from "./types";
import { computeMonthStats, gradeOf, latestAssessment, medFrequencyQuestion, preventionDiscussionReasons, STANDARD_QUESTIONS, DISCLAIMER, daysInRange } from "./rules";
import { activeTriggers, TRIGGER_LABEL } from "./medInfo";
import { formatCn } from "./dates";

export interface SummarySection {
  title: string;
  lines: string[];
}

const np = (s: string | null | undefined) => (s && s.trim() ? s.trim() : "未提供");
const tri = (v: keyof typeof TRI_LABEL) => (v === "unset" ? "未提供" : TRI_LABEL[v]);

export function buildSummary(data: AppData, year: number, month: number, today: string): SummarySection[] {
  const p = data.profile;
  const s = computeMonthStats(data.days, year, month, today);
  const recs = daysInRange(data.days, s.start, s.expectedEnd ?? s.end).sort((a, b) => a.date.localeCompare(b.date));
  const sections: SummarySection[] = [];

  sections.push({
    title: "1. 基本情况",
    lines: [
      `年龄：${p.age ?? "未提供"}`,
      `是否经医生确诊偏头痛：${tri(p.diagnosed)}`,
      `头痛开始的大致时间：${np(p.onset)}`,
      `备孕：${tri(p.tryingToConceive)}；怀孕：${tri(p.pregnant)}；哺乳：${tri(p.breastfeeding)}`,
    ],
  });

  const periodLine = s.expectedEnd
    ? `统计区间：${formatCn(s.start)}–${formatCn(s.expectedEnd)}（自然月 ${formatCn(s.start)}–${formatCn(s.end)}）`
    : `统计区间：${formatCn(s.start)}–${formatCn(s.end)}（尚未到来）`;
  sections.push({
    title: "2. 统计区间与记录完整度",
    lines: [
      periodLine,
      `已记录 ${s.recordedDays} 天／应记录 ${s.expectedDays} 天${s.complete ? "（完整）" : "（不完整，以下统计仅覆盖已填写的日期）"}`,
    ],
  });

  sections.push({
    title: "3. 头痛情况",
    lines: [
      `明确记录有头痛：${s.headacheDays} 天；无头痛：${s.noHeadacheDays} 天；不确定：${s.unknownDays} 天`,
      `需要停止部分活动或基本无法正常活动：${s.impactedDays} 天；能继续但效率下降：${s.reducedEfficiencyDays} 天`,
      s.avgPain === null ? "平均最严重疼痛程度：未提供" : `平均最严重疼痛程度：${s.avgPain}／10（样本 ${s.painSampleDays} 天）`,
    ],
  });

  const acuteLines: string[] = [`急性期用药天数：${s.acuteMedDays} 天`];
  s.acuteDaysByCategory.forEach((c) => acuteLines.push(`　其中 ${c.category}：${c.days} 天`));
  const acuteMeds = recs.flatMap((d) => d.medications.filter((m) => m.purpose === "acute").map((m) => ({ d, m })));
  if (!acuteMeds.length) acuteLines.push("本期无急性期用药记录。");
  acuteMeds.forEach(({ d, m }) =>
    acuteLines.push(
      `${d.date} ${m.name}｜用量：${np(m.actualDose)}｜时间：${np(m.takenAt)}｜2小时疼痛：${m.painAt2h ?? "未观察"}｜恢复活动：${RECOVERY_LABEL[m.activityRecovery]}｜再次头痛：${RECURRENCE_LABEL[m.recurrence]}｜不适：${np(m.adverseEffects)}`,
    ),
  );
  if (s.unknownPurposeMeds.length) {
    acuteLines.push(`用药目的不确定（未计入急性期用药天数）：`);
    s.unknownPurposeMeds.forEach(({ date, med }) => acuteLines.push(`　${date} ${med.name}（${np(med.actualDose)}）`));
  }
  sections.push({ title: "4. 急性期用药及所填药效", lines: acuteLines });

  sections.push({
    title: "5. 预防用药与既往用药",
    lines: [
      `本期记录的预防用药：${s.preventiveMedNames.length ? s.preventiveMedNames.join("、") : "未提供"}`,
      `曾用过的偏头痛药物及停用原因：${np(p.pastMigraineMeds)}`,
    ],
  });

  const midas = latestAssessment(data.assessments, "MIDAS");
  const hit6 = latestAssessment(data.assessments, "HIT6");
  sections.push({
    title: "6. 量表结果（最近一次）",
    lines: [
      midas
        ? `MIDAS：${midas.score} 分，${gradeOf(midas)}；填写日期 ${midas.completedOn}；回顾区间 ${midas.periodStart ?? "未提供"}–${midas.periodEnd ?? "未提供"}；版本／来源 ${np(midas.versionOrSource)}`
        : "MIDAS：尚未录入",
      hit6 ? `HIT-6：${hit6.score} 分，${gradeOf(hit6)}；填写日期 ${hit6.completedOn}；版本／来源 ${np(hit6.versionOrSource)}` : "HIT-6：尚未录入",
    ],
  });

  const conds = p.conditions.filter((c) => c !== "其他");
  if (p.conditions.includes("其他")) conds.push(`其他：${np(p.conditionsOther)}`);
  sections.push({
    title: "7. 其他疾病、过敏和长期用药",
    lines: [
      `已知疾病：${conds.length ? conds.join("、") : "未提供"}`,
      `药物过敏或不耐受：${np(p.allergies)}`,
      `当前长期使用的药物：${np(p.longTermMeds)}`,
    ],
  });

  const q: string[] = [];
  const reasons = preventionDiscussionReasons(data);
  if (reasons.length) q.push(`值得与医生讨论预防治疗。依据：${reasons.join(" ")}`);
  q.push(medFrequencyQuestion(s.acuteMedDays));
  q.push(...STANDARD_QUESTIONS);
  const trig = activeTriggers(p);
  if (trig.length) q.push(`我的以下情况会限制哪些药物选择：${trig.map((t) => TRIGGER_LABEL[t.trigger] + (t.uncertain ? "（不确定）" : "")).join("、")}？`);
  if (data.prep.mainConcern.trim()) q.push(`我最想解决的问题：${data.prep.mainConcern.trim()}`);
  if (data.prep.treatmentGoal.trim()) q.push(`我希望的治疗目标：${data.prep.treatmentGoal.trim()}`);
  if (data.prep.ownQuestions.trim()) q.push(`我自己的问题：${data.prep.ownQuestions.trim()}`);
  sections.push({ title: "8. 建议与医生讨论的问题", lines: q });

  return sections;
}

export function summaryToText(sections: SummarySection[], generatedOn: string): string {
  return [
    "偏头痛就诊摘要",
    `生成日期：${generatedOn}`,
    DISCLAIMER,
    "",
    ...sections.flatMap((s) => [s.title, ...s.lines.map((l) => `- ${l}`), ""]),
  ].join("\n");
}

