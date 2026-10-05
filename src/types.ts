export type Tri = "yes" | "no" | "unknown";
/** 基础资料用：unset = 未填写，与“不确定”区分 */
export type TriOrUnset = Tri | "unset";

export interface Profile {
  age: number | null;
  diagnosed: TriOrUnset;
  onset: string;
  tryingToConceive: TriOrUnset;
  pregnant: TriOrUnset;
  breastfeeding: TriOrUnset;
  conditions: string[];
  conditionsOther: string;
  allergies: string;
  longTermMeds: string;
  pastMigraineMeds: string;
  savedAt: string | null;
}

/** 自编“就诊前情况整理表”，不是医学量表，不计分 */
export interface VisitPrep {
  lifeImpact: TriOrUnset; // 头痛是否明显影响生活
  acuteUnsatisfied: TriOrUnset; // 是否对当前急性期治疗不满意
  mainConcern: string;
  treatmentGoal: string;
  ownQuestions: string;
}

export type ActivityImpact = "none" | "reduced" | "stop_some" | "unable";

export interface MedicationRecord {
  id: string;
  name: string;
  purpose: "acute" | "preventive" | "other" | "unknown";
  category: string;
  actualDose: string;
  takenAt: string | null;
  painAt2h: number | null;
  activityRecovery: "full" | "partial" | "none" | "unknown";
  recurrence: "yes" | "no" | "unknown";
  adverseEffects: string;
}

export interface DayRecord {
  id: string;
  date: string; // 本地日历日期 YYYY-MM-DD
  headache: Tri;
  maxPain: number | null;
  activityImpact: ActivityImpact | null;
  durationHours: number | null;
  continuesPreviousDay: Tri;
  symptoms: string[];
  aura: Tri;
  auraDescription: string;
  menstruation: Tri;
  possibleFactors: string[];
  medications: MedicationRecord[];
  notes: string;
  updatedAt: string;
}

export interface AssessmentRecord {
  id: string;
  type: "MIDAS" | "HIT6";
  completedOn: string;
  periodStart: string | null;
  periodEnd: string | null;
  score: number;
  versionOrSource: string;
}

export interface AppData {
  schemaVersion: 1;
  profile: Profile;
  prep: VisitPrep;
  days: DayRecord[];
  assessments: AssessmentRecord[];
  updatedAt: string;
}

export const CONDITIONS = [
  "高血压",
  "心血管疾病或卒中史",
  "哮喘",
  "胃溃疡或消化道出血",
  "肾病或肾结石",
  "肝病",
  "青光眼",
  "睡眠问题",
  "焦虑或抑郁",
  "其他",
] as const;

export const SYMPTOMS = ["恶心", "呕吐", "怕光", "怕声音", "头痛随活动加重", "其他"];
export const FACTORS = ["睡眠不足", "压力", "漏餐", "饮酒", "其他"];
export const MED_CATEGORIES = [
  "普通非阿片类止痛药／NSAIDs",
  "曲普坦类",
  "复方止痛药",
  "吉泮类",
  "其他",
  "不确定",
];

export const TRI_LABEL: Record<TriOrUnset, string> = {
  yes: "是",
  no: "否",
  unknown: "不确定",
  unset: "未填写",
};
export const IMPACT_LABEL: Record<ActivityImpact, string> = {
  none: "无影响",
  reduced: "能继续但效率下降",
  stop_some: "需要停止部分活动",
  unable: "基本无法正常活动",
};
export const PURPOSE_LABEL: Record<MedicationRecord["purpose"], string> = {
  acute: "急性期缓解",
  preventive: "日常预防",
  other: "其他",
  unknown: "不确定",
};
export const RECOVERY_LABEL: Record<MedicationRecord["activityRecovery"], string> = {
  full: "完全恢复",
  partial: "部分恢复",
  none: "没有恢复",
  unknown: "未观察",
};
export const RECURRENCE_LABEL: Record<MedicationRecord["recurrence"], string> = {
  yes: "是",
  no: "否",
  unknown: "尚未观察",
};
