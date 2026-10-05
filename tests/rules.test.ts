import { describe, expect, it } from "vitest";
import { computeMonthStats, hit6Grade, midasGrade, preventionDiscussionReasons, medFrequencyQuestion } from "../src/rules";
import { validateAppData, validateDayForSave, validateScaleScore } from "../src/validate";
import { emptyData, emptyDay, emptyMed, emptyProfile } from "../src/defaults";
import { buildSummary, summaryToText } from "../src/summary";
import { buildClassCards, DRUG_CLASSES } from "../src/medInfo";
import { daysBetweenInclusive, toLocalDate } from "../src/dates";
import type { DayRecord, MedicationRecord } from "../src/types";

const TODAY = "2026-10-15";
function day(date: string, headache: DayRecord["headache"], extra: Partial<DayRecord> = {}): DayRecord {
  return { ...emptyDay(date), headache, maxPain: headache === "yes" ? 5 : null, updatedAt: "x", ...extra };
}
const med = (p: Partial<MedicationRecord>): MedicationRecord => ({ ...emptyMed(), name: "药A", ...p });

describe("新用户默认值（验收1）", () => {
  it("年龄 30，其余健康信息未填写", () => {
    const p = emptyProfile();
    expect(p.age).toBe(30);
    expect([p.diagnosed, p.tryingToConceive, p.pregnant, p.breastfeeding]).toEqual(["unset", "unset", "unset", "unset"]);
    expect(p.conditions).toEqual([]);
  });
});

describe("月度统计口径", () => {
  it("连续两天分别记录头痛 = 2 天（验收5）", () => {
    const s = computeMonthStats([day("2026-10-01", "yes"), day("2026-10-02", "yes")], 2026, 10, TODAY);
    expect(s.headacheDays).toBe(2);
  });
  it("同一天多次急性期用药 = 1 个用药日（验收6）", () => {
    const s = computeMonthStats([day("2026-10-03", "yes", { medications: [med({}), med({}), med({ category: "曲普坦类" })] })], 2026, 10, TODAY);
    expect(s.acuteMedDays).toBe(1);
    expect(s.acuteDaysByCategory).toEqual([{ category: "不确定", days: 1 }, { category: "曲普坦类", days: 1 }]);
  });
  it("无头痛但有急性期用药仍计用药日（验收7）", () => {
    const s = computeMonthStats([day("2026-10-04", "no", { medications: [med({})] })], 2026, 10, TODAY);
    expect(s.acuteMedDays).toBe(1);
    expect(s.headacheDays).toBe(0);
  });
  it("预防用药不计入急性期用药天数（验收8）；目的不确定单独列示", () => {
    const s = computeMonthStats(
      [day("2026-10-05", "no", { medications: [med({ purpose: "preventive", name: "预防药" })] }), day("2026-10-06", "yes", { medications: [med({ purpose: "unknown", name: "不明药" })] })],
      2026, 10, TODAY,
    );
    expect(s.acuteMedDays).toBe(0);
    expect(s.preventiveMedNames).toEqual(["预防药"]);
    expect(s.unknownPurposeMeds.map((x) => x.med.name)).toEqual(["不明药"]);
  });
  it("缺失记录不算无头痛；完整度按截至今天计算（验收9）", () => {
    const s = computeMonthStats([day("2026-10-01", "yes"), day("2026-10-02", "no")], 2026, 10, TODAY);
    expect(s.expectedDays).toBe(15);
    expect(s.recordedDays).toBe(2);
    expect(s.noHeadacheDays).toBe(1);
    expect(s.complete).toBe(false);
  });
  it("过去整月应记录天数为全月；未来月份为 0", () => {
    expect(computeMonthStats([], 2026, 9, TODAY).expectedDays).toBe(30);
    expect(computeMonthStats([], 2026, 11, TODAY).expectedDays).toBe(0);
    expect(computeMonthStats([], 2024, 2, TODAY).expectedDays).toBe(29);
  });
  it("平均疼痛只用已填数值，并给出样本天数；活动影响计数", () => {
    const s = computeMonthStats(
      [day("2026-10-01", "yes", { maxPain: 4, activityImpact: "unable" }), day("2026-10-02", "yes", { maxPain: 7, activityImpact: "reduced" }), day("2026-10-03", "unknown")],
      2026, 10, TODAY,
    );
    expect(s.avgPain).toBe(5.5);
    expect(s.painSampleDays).toBe(2);
    expect(s.impactedDays).toBe(1);
    expect(s.reducedEfficiencyDays).toBe(1);
  });
  it("跨月记录不混入", () => {
    const s = computeMonthStats([day("2026-09-30", "yes"), day("2026-10-01", "yes")], 2026, 10, TODAY);
    expect(s.headacheDays).toBe(1);
  });
});

describe("同日重复填写（验收4）", () => {
  it("按日期 upsert 后头痛天数不增加", () => {
    const upsert = (days: DayRecord[], d: DayRecord) => [...days.filter((x) => x.date !== d.date), d];
    let days: DayRecord[] = [];
    days = upsert(days, day("2026-10-07", "yes"));
    days = upsert(days, day("2026-10-07", "yes", { maxPain: 8 }));
    expect(computeMonthStats(days, 2026, 10, TODAY).headacheDays).toBe(1);
    expect(days[0].maxPain).toBe(8);
  });
});

describe("量表分级边界与非法分数（验收10）", () => {
  it("MIDAS 边界", () => {
    expect(midasGrade(0)).toContain("很小");
    expect(midasGrade(5)).toContain("很小");
    expect(midasGrade(6)).toContain("轻度");
    expect(midasGrade(10)).toContain("轻度");
    expect(midasGrade(11)).toContain("中度");
    expect(midasGrade(20)).toContain("中度");
    expect(midasGrade(21)).toContain("重度");
  });
  it("HIT-6 边界", () => {
    expect(hit6Grade(36)).toContain("很小");
    expect(hit6Grade(49)).toContain("很小");
    expect(hit6Grade(50)).toContain("一定");
    expect(hit6Grade(55)).toContain("一定");
    expect(hit6Grade(56)).toContain("较大");
    expect(hit6Grade(59)).toContain("较大");
    expect(hit6Grade(60)).toContain("严重");
    expect(hit6Grade(78)).toContain("严重");
  });
  it("非法分数被拒绝", () => {
    for (const bad of ["", "-1", "5.5", "abc", "271"]) expect(validateScaleScore("MIDAS", bad).ok).toBe(false);
    for (const bad of ["35", "79", "0", "50.0"]) expect(validateScaleScore("HIT6", bad).ok).toBe(false);
    expect(validateScaleScore("HIT6", "36").ok).toBe(true);
    expect(validateScaleScore("MIDAS", "0").ok).toBe(true);
  });
});

describe("每日记录校验", () => {
  it("禁止未来日期；有头痛时必须填疼痛程度", () => {
    expect(validateDayForSave(day("2026-10-16", "no"), TODAY).join()).toContain("未来");
    expect(validateDayForSave(day("2026-10-10", "yes", { maxPain: null }), TODAY).join()).toContain("疼痛程度");
    expect(validateDayForSave(day("2026-10-10", "no", { medications: [med({ name: " " })] }), TODAY).join()).toContain("药名");
    expect(validateDayForSave(day("2026-10-10", "yes"), TODAY)).toEqual([]);
  });
});

describe("提示规则", () => {
  it("某自然月 ≥4 头痛日触发预防讨论提示，3 天不触发", () => {
    const d = emptyData();
    d.days = ["01", "02", "03"].map((x) => day(`2026-10-${x}`, "yes"));
    expect(preventionDiscussionReasons(d)).toEqual([]);
    d.days.push(day("2026-10-09", "yes"));
    expect(preventionDiscussionReasons(d)[0]).toContain("2026-10");
  });
  it("用户主动表示影响生活或不满意也会触发", () => {
    const d = emptyData();
    d.prep.acuteUnsatisfied = "yes";
    expect(preventionDiscussionReasons(d).length).toBe(1);
  });
  it("用药频率问题文案", () => {
    expect(medFrequencyQuestion(3)).toBe("这个月记录的急性期用药为 3 天，请与医生确认使用频率及是否需要调整整体治疗方案。");
  });
});

describe("就诊摘要（验收11、12、16）", () => {
  it("包含资料、药物和统计区间；量表缺失显示尚未录入；未填显示未提供", () => {
    const d = emptyData();
    d.profile.pregnant = "no";
    d.days = [day("2026-10-02", "yes", { medications: [med({ name: "某止痛片", actualDose: "1片", painAt2h: 2 })] })];
    const text = summaryToText(buildSummary(d, 2026, 10, TODAY), "2026年10月15日");
    expect(text).toContain("年龄：30");
    expect(text).toContain("怀孕：否");
    expect(text).toContain("备孕：未提供");
    expect(text).toContain("2026年10月1日–2026年10月15日");
    expect(text).toContain("已记录 1 天／应记录 15 天");
    expect(text).toContain("某止痛片｜用量：1片");
    expect(text).toContain("2小时疼痛：2");
    expect(text).toContain("MIDAS：尚未录入");
    expect(text).toContain("HIT-6：尚未录入");
    expect(text).not.toMatch(/MIDAS：0/);
    expect(text).not.toMatch(/mg|毫克|建议服用|停药|加量|最适合/);
  });
});

describe("用药沟通卡不排名、不给剂量（验收16）", () => {
  it("所有人类别顺序一致，内容无剂量词", () => {
    const a = buildClassCards(emptyProfile()).map((c) => c.cls.id);
    const p = { ...emptyProfile(), pregnant: "yes" as const, conditions: ["哮喘"] };
    const b = buildClassCards(p);
    expect(b.map((c) => c.cls.id)).toEqual(a);
    expect(b.find((c) => c.cls.id === "beta")!.points[0].label).toBe("哮喘");
    const all = JSON.stringify(DRUG_CLASSES);
    expect(all).not.toMatch(/\d+\s*(mg|毫克|片\/|次\/日)|首选|最适合|推荐你/);
  });
  it("空白资料不产生个人化提示", () => {
    expect(buildClassCards(emptyProfile()).every((c) => c.points.length === 0)).toBe(true);
  });
});

describe("JSON 导入导出（验收13、14）", () => {
  it("导出后再导入核心数据一致", () => {
    const d = emptyData();
    d.days = [day("2026-10-02", "yes", { medications: [med({})] })];
    d.assessments = [{ id: "a1", type: "HIT6", completedOn: "2026-10-01", periodStart: null, periodEnd: null, score: 58, versionOrSource: "医院" }];
    const v = validateAppData(JSON.parse(JSON.stringify(d)));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.data.days).toEqual(d.days);
      expect(v.data.assessments).toEqual(d.assessments);
      expect(v.data.profile).toEqual(d.profile);
      expect(v.counts).toEqual({ days: 1, medications: 1, assessments: 1 });
    }
  });
  it("错误数据被拒绝", () => {
    const d = emptyData();
    expect(validateAppData(null).ok).toBe(false);
    expect(validateAppData({ ...d, schemaVersion: 2 }).ok).toBe(false);
    expect(validateAppData({ ...d, days: [{ ...day("2026-02-30", "no") }] }).ok).toBe(false);
    expect(validateAppData({ ...d, days: [day("2026-10-01", "maybe" as never)] }).ok).toBe(false);
    expect(validateAppData({ ...d, days: [day("2026-10-01", "yes", { maxPain: 11 })] }).ok).toBe(false);
    expect(validateAppData({ ...d, days: [day("2026-10-01", "no"), day("2026-10-01", "no")] }).ok).toBe(false);
    expect(validateAppData({ ...d, assessments: [{ id: "x", type: "HIT6", completedOn: "2026-10-01", periodStart: null, periodEnd: null, score: 20, versionOrSource: "" }] }).ok).toBe(false);
  });
});

describe("日期不经 UTC 转换", () => {
  it("本地日期格式化保持日历日", () => {
    expect(toLocalDate(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    expect(toLocalDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
    expect(daysBetweenInclusive("2026-03-01", "2026-03-31")).toBe(31);
  });
});
