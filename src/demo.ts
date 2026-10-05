/** 演示数据：明显虚构（示例药A/B），只写入独立的演示存储键 */
import type { AppData } from "./types";
import { emptyData, emptyDay, emptyMed } from "./defaults";

export function makeDemoData(today: string): AppData {
  const d = emptyData();
  d.profile = { ...d.profile, diagnosed: "yes", tryingToConceive: "no", pregnant: "no", breastfeeding: "no", conditions: ["哮喘"], savedAt: new Date().toISOString() };
  const [y, m, day] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dates = [1, 2, 3, 5, 8, 9].filter((x) => x <= day).map((x) => `${y}-${pad(m)}-${pad(x)}`);
  d.days = dates.map((date, i) => {
    const r = emptyDay(date);
    r.headache = i % 3 === 2 ? "no" : "yes";
    r.maxPain = r.headache === "yes" ? 4 + (i % 4) : null;
    r.activityImpact = r.headache === "yes" ? (i % 2 ? "stop_some" : "reduced") : null;
    if (r.headache === "yes") r.medications = [{ ...emptyMed(), name: "示例药A", actualDose: "1片", category: "普通非阿片类止痛药／NSAIDs" }];
    r.updatedAt = new Date().toISOString();
    return r;
  });
  return d;
}
