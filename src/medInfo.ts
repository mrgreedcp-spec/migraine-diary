/**
 * 用药沟通卡：常见偏头痛药物类别的通用资料 + 根据基础资料列出“需要与医生确认的点”。
 * - 所有人看到的类别和顺序相同，不排名、不推荐、不给剂量。
 * - 个人化部分只把用户已填写的情况和公开的通用注意事项对上，交给医生判断。
 * - 未经医学审核；正式版应替换为经审核的药物知识库。
 */
import type { Profile } from "./types";

export type Trigger =
  | "pregnant"
  | "ttc"
  | "breastfeeding"
  | "高血压"
  | "心血管疾病或卒中史"
  | "哮喘"
  | "胃溃疡或消化道出血"
  | "肾病或肾结石"
  | "肝病"
  | "青光眼"
  | "睡眠问题"
  | "焦虑或抑郁"
  | "longTermMeds";

export interface DrugClass {
  id: string;
  name: string;
  role: "急性期" | "预防";
  examples: string;
  general: string;
  notes: Partial<Record<Trigger, string>>;
}

export const DRUG_CLASSES: DrugClass[] = [
  {
    id: "nsaid",
    name: "普通非阿片类止痛药／NSAIDs",
    role: "急性期",
    examples: "布洛芬、萘普生、阿司匹林、对乙酰氨基酚等",
    general: "多数指南把它们列为轻中度发作的常用选择之一。",
    notes: {
      胃溃疡或消化道出血: "NSAIDs 和阿司匹林可能增加消化道出血风险。",
      肾病或肾结石: "NSAIDs 可能影响肾功能。",
      哮喘: "部分哮喘患者对阿司匹林或其他 NSAIDs 敏感。",
      高血压: "NSAIDs 可能影响血压控制。",
      心血管疾病或卒中史: "NSAIDs 与心血管风险有关，需要评估。",
      肝病: "对乙酰氨基酚经肝脏代谢，需要确认能否使用。",
      pregnant: "孕期（尤其孕中晚期）一般要避免或严格评估 NSAIDs。",
      ttc: "备孕期间的止痛药选择需要提前与医生确认。",
      breastfeeding: "哺乳期可用的止痛药需要医生确认。",
    },
  },
  {
    id: "triptan",
    name: "曲普坦类",
    role: "急性期",
    examples: "舒马普坦、佐米曲普坦、利扎曲普坦等",
    general: "偏头痛特异性的急性期药物，有收缩血管作用。",
    notes: {
      心血管疾病或卒中史: "冠心病、卒中史等通常属于禁用或需严格评估的情况。",
      高血压: "未控制的高血压通常不宜使用，需要确认血压情况。",
      焦虑或抑郁: "若在用部分抗抑郁药（如 SSRI／SNRI），需评估合用风险。",
      longTermMeds: "请把长期用药清单给医生，确认有无相互作用。",
      pregnant: "孕期使用需要医生权衡。",
      ttc: "备孕期间是否使用需要医生权衡。",
      breastfeeding: "哺乳期使用需要医生确认。",
    },
  },
  {
    id: "combo",
    name: "复方止痛药",
    role: "急性期",
    examples: "含咖啡因、可待因等成分的复方制剂",
    general: "频繁使用与药物过度使用性头痛风险有关；含阿片类成分的药一般不作为偏头痛常规选择。",
    notes: {
      肝病: "复方制剂常含对乙酰氨基酚，需要确认总量是否合适。",
      睡眠问题: "含咖啡因的制剂可能影响睡眠。",
      pregnant: "孕期需要医生确认每种成分。",
      breastfeeding: "哺乳期需要医生确认每种成分。",
    },
  },
  {
    id: "gepant",
    name: "吉泮类（CGRP 受体拮抗剂）",
    role: "急性期",
    examples: "瑞美吉泮、乌布吉泮等（部分也用于预防）",
    general: "较新的药物类别，不收缩血管；国内可及性和费用因地区而异。",
    notes: {
      心血管疾病或卒中史: "可询问医生：在心血管情况下，这类药物是否可以考虑。",
      肝病: "严重肝功能不全时需要评估。",
      longTermMeds: "与部分药物（如影响 CYP3A4 的药物）有相互作用，请提供用药清单。",
      pregnant: "孕期数据有限，需要医生评估。",
      breastfeeding: "哺乳期数据有限，需要医生评估。",
    },
  },
  {
    id: "beta",
    name: "β受体阻滞剂",
    role: "预防",
    examples: "普萘洛尔、美托洛尔等",
    general: "常用的偏头痛预防药物之一。",
    notes: {
      哮喘: "哮喘患者通常需要避免或谨慎使用。",
      焦虑或抑郁: "部分人可能出现情绪低落，需要医生评估。",
      高血压: "也有降压作用，可询问能否兼顾血压管理。",
    },
  },
  {
    id: "anticonvulsant",
    name: "抗癫痫类",
    role: "预防",
    examples: "托吡酯、丙戊酸等",
    general: "用于偏头痛预防，但有较多需要评估的情况。",
    notes: {
      ttc: "托吡酯和丙戊酸有致畸风险，备孕时必须先告诉医生。",
      pregnant: "托吡酯和丙戊酸有致畸风险，怀孕时必须告诉医生。",
      breastfeeding: "哺乳期需要医生评估。",
      肾病或肾结石: "托吡酯可能增加肾结石风险。",
      青光眼: "托吡酯有引起急性闭角型青光眼的报告。",
      肝病: "丙戊酸需要评估肝功能。",
      焦虑或抑郁: "托吡酯可能影响情绪和认知，需要评估。",
    },
  },
  {
    id: "antidepressant",
    name: "抗抑郁类",
    role: "预防",
    examples: "阿米替林、文拉法辛等",
    general: "部分抗抑郁药也用于偏头痛预防。",
    notes: {
      青光眼: "阿米替林在某些类型青光眼中需要谨慎。",
      睡眠问题: "阿米替林可能引起嗜睡，可询问对睡眠的影响。",
      焦虑或抑郁: "若已在用抗抑郁药，需要评估合用和相互作用。",
      心血管疾病或卒中史: "阿米替林需要评估心脏情况。",
      longTermMeds: "请提供长期用药清单，确认相互作用。",
    },
  },
  {
    id: "ccb",
    name: "钙通道阻滞剂",
    role: "预防",
    examples: "氟桂利嗪等",
    general: "国内常用的预防药物之一。",
    notes: {
      焦虑或抑郁: "氟桂利嗪可能诱发或加重抑郁，需要医生评估。",
      睡眠问题: "可能引起嗜睡。",
    },
  },
  {
    id: "arb",
    name: "血管紧张素受体阻滞剂",
    role: "预防",
    examples: "坎地沙坦等",
    general: "部分指南列为预防选择之一。",
    notes: {
      pregnant: "孕期禁用，怀孕时必须告诉医生。",
      ttc: "孕期禁用，备孕时必须先告诉医生。",
      高血压: "也有降压作用，可询问能否兼顾血压管理。",
      肾病或肾结石: "需要评估肾功能。",
    },
  },
  {
    id: "cgrp_mab",
    name: "CGRP 相关单克隆抗体",
    role: "预防",
    examples: "依瑞奈尤单抗、加卡奈珠单抗、瑞玛奈珠单抗等（注射）",
    general: "较新的预防药物；费用和可及性因地区而异。",
    notes: {
      pregnant: "孕期数据有限，需要医生评估。",
      ttc: "药物在体内停留时间较长，备孕前需要医生评估。",
      breastfeeding: "哺乳期数据有限，需要医生评估。",
      高血压: "依瑞奈尤单抗上市后有血压升高的报告。",
    },
  },
];

export const TRIGGER_LABEL: Record<Trigger, string> = {
  pregnant: "怀孕",
  ttc: "备孕",
  breastfeeding: "哺乳",
  longTermMeds: "长期用药",
  高血压: "高血压",
  心血管疾病或卒中史: "心血管疾病或卒中史",
  哮喘: "哮喘",
  胃溃疡或消化道出血: "胃溃疡或消化道出血",
  肾病或肾结石: "肾病或肾结石",
  肝病: "肝病",
  青光眼: "青光眼",
  睡眠问题: "睡眠问题",
  焦虑或抑郁: "焦虑或抑郁",
};

/** 从资料中取出“是”或“不确定”的情况。不确定也要告诉医生。 */
export function activeTriggers(p: Profile): { trigger: Trigger; uncertain: boolean }[] {
  const out: { trigger: Trigger; uncertain: boolean }[] = [];
  const tri = (v: Profile["pregnant"], t: Trigger) => {
    if (v === "yes" || v === "unknown") out.push({ trigger: t, uncertain: v === "unknown" });
  };
  tri(p.pregnant, "pregnant");
  tri(p.tryingToConceive, "ttc");
  tri(p.breastfeeding, "breastfeeding");
  for (const c of p.conditions) if (c in TRIGGER_LABEL) out.push({ trigger: c as Trigger, uncertain: false });
  if (p.longTermMeds.trim()) out.push({ trigger: "longTermMeds", uncertain: false });
  return out;
}

export function unsetProfileItems(p: Profile): string[] {
  const xs: string[] = [];
  if (p.age === null) xs.push("年龄");
  if (p.diagnosed === "unset") xs.push("是否确诊");
  if (p.tryingToConceive === "unset") xs.push("是否备孕");
  if (p.pregnant === "unset") xs.push("是否怀孕");
  if (p.breastfeeding === "unset") xs.push("是否哺乳");
  return xs;
}

export interface ClassCard {
  cls: DrugClass;
  points: { label: string; text: string; uncertain: boolean }[];
}
export function buildClassCards(p: Profile): ClassCard[] {
  const triggers = activeTriggers(p);
  return DRUG_CLASSES.map((cls) => ({
    cls,
    points: triggers
      .filter(({ trigger }) => cls.notes[trigger])
      .map(({ trigger, uncertain }) => ({ label: TRIGGER_LABEL[trigger], text: cls.notes[trigger] as string, uncertain })),
  }));
}
