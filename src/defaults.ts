import type { AppData, DayRecord, MedicationRecord, Profile, VisitPrep } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function emptyProfile(): Profile {
  return {
    age: 30,
    diagnosed: "unset",
    onset: "",
    tryingToConceive: "unset",
    pregnant: "unset",
    breastfeeding: "unset",
    conditions: [],
    conditionsOther: "",
    allergies: "",
    longTermMeds: "",
    pastMigraineMeds: "",
    savedAt: null,
  };
}
export function emptyPrep(): VisitPrep {
  return { lifeImpact: "unset", acuteUnsatisfied: "unset", mainConcern: "", treatmentGoal: "", ownQuestions: "" };
}
export function emptyData(): AppData {
  return {
    schemaVersion: 1,
    profile: emptyProfile(),
    prep: emptyPrep(),
    days: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  };
}
export function emptyDay(date: string): DayRecord {
  return {
    id: uid(),
    date,
    headache: "unknown",
    maxPain: null,
    activityImpact: null,
    durationHours: null,
    continuesPreviousDay: "unknown",
    symptoms: [],
    aura: "unknown",
    auraDescription: "",
    menstruation: "unknown",
    possibleFactors: [],
    medications: [],
    notes: "",
    updatedAt: "",
  };
}
export function emptyMed(): MedicationRecord {
  return {
    id: uid(),
    name: "",
    purpose: "acute",
    category: "不确定",
    actualDose: "",
    takenAt: null,
    painAt2h: null,
    activityRecovery: "unknown",
    recurrence: "unknown",
    adverseEffects: "",
  };
}
