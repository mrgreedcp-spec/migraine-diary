import { useState } from "react";
import type { AppData, AssessmentRecord, DayRecord, Profile, VisitPrep } from "./types";
import { DATA_KEY, DEMO_KEY, DRAFT_KEY, loadData, removeKey, writeKey, storageAvailable, type SaveResult } from "./storage";
import { emptyData } from "./defaults";
import { makeDemoData } from "./demo";
import { DISCLAIMER } from "./rules";
import { todayLocal } from "./dates";
import { ProfilePage } from "./pages/ProfilePage";
import { MedCardPage } from "./pages/MedCardPage";
import { RecordPage } from "./pages/RecordPage";
import { MonthPage } from "./pages/MonthPage";
import { AssessPage } from "./pages/AssessPage";
import { MePage } from "./pages/MePage";
import { VisitSummaryPage } from "./pages/VisitSummaryPage";

type Tab = "record" | "month" | "assess" | "me";
type Sub = null | "profile" | "medcard" | "summary";

export default function App() {
  const [demo, setDemo] = useState(false);
  const key = demo ? DEMO_KEY : DATA_KEY;
  const draftKey = demo ? DRAFT_KEY + "-demo" : DRAFT_KEY;
  const [{ data, warning }, setLoaded] = useState(() => loadData(DATA_KEY));
  const [tab, setTab] = useState<Tab>("record");
  const [sub, setSub] = useState<Sub>(() => (data.profile.savedAt ? null : "profile"));
  const [onboarding, setOnboarding] = useState(!data.profile.savedAt);
  const [ym, setYm] = useState(() => {
    const [y, m] = todayLocal().split("-").map(Number);
    return { year: y, month: m };
  });
  const [recordKey, setRecordKey] = useState(0);

  /** 只有写入成功才更新界面状态，失败时保留原数据 */
  function commit(next: AppData): SaveResult {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    const r = writeKey(key, stamped);
    if (r.ok) setLoaded({ data: stamped, warning: null });
    return r;
  }

  const saveDay = (d: DayRecord) => commit({ ...data, days: [...data.days.filter((x) => x.date !== d.date), d].sort((a, b) => a.date.localeCompare(b.date)) });
  const saveProfile = (p: Profile) => {
    const r = commit({ ...data, profile: p });
    if (r.ok) {
      setSub("medcard");
      setOnboarding(false);
      window.scrollTo(0, 0);
    }
    return r;
  };
  const addAssessment = (a: AssessmentRecord) => commit({ ...data, assessments: [...data.assessments, a] });
  const deleteAssessment = (id: string) => commit({ ...data, assessments: data.assessments.filter((a) => a.id !== id) });
  const savePrep = (p: VisitPrep) => commit({ ...data, prep: p });
  const replaceAll = (d: AppData) => {
    const r = commit(d);
    if (r.ok) {
      removeKey(draftKey);
      setRecordKey((k) => k + 1);
    }
    return r;
  };
  const clearAll = (): SaveResult => {
    removeKey(key);
    removeKey(draftKey);
    setLoaded({ data: emptyData(), warning: null });
    setRecordKey((k) => k + 1);
    if (!demo) {
      setOnboarding(true);
      setSub("profile");
    }
    return { ok: true };
  };
  function toggleDemo() {
    if (demo) {
      setDemo(false);
      const l = loadData(DATA_KEY);
      setLoaded(l);
      setSub(l.data.profile.savedAt ? null : "profile");
      setOnboarding(!l.data.profile.savedAt);
    } else {
      const existing = loadData(DEMO_KEY);
      const d = existing.data.profile.savedAt ? existing.data : makeDemoData(todayLocal());
      writeKey(DEMO_KEY, d);
      setDemo(true);
      setLoaded({ data: d, warning: null });
      setSub(null);
      setOnboarding(false);
    }
    setRecordKey((k) => k + 1);
    setTab("month");
  }
  const go = (t: Tab) => {
    setTab(t);
    setSub(null);
    window.scrollTo(0, 0);
  };

  let page;
  if (sub === "profile")
    page = (
      <ProfilePage
        key={data.updatedAt + "p"}
        initial={data.profile}
        onSave={saveProfile}
        onboarding={onboarding}
        onSkip={() => {
          setOnboarding(false);
          setSub(null);
        }}
      />
    );
  else if (sub === "medcard") page = <MedCardPage profile={data.profile} onEditProfile={() => setSub("profile")} onDone={() => go("record")} />;
  else if (sub === "summary") page = <VisitSummaryPage data={data} ym={ym} setYm={setYm} onBack={() => setSub(null)} />;
  else if (tab === "record") page = <RecordPage key={recordKey} data={data} draftKey={draftKey} onSaveDay={saveDay} />;
  else if (tab === "month") page = <MonthPage data={data} ym={ym} setYm={setYm} onSummary={() => setSub("summary")} onMedCard={() => setSub("medcard")} />;
  else if (tab === "assess") page = <AssessPage data={data} onAdd={addAssessment} onDelete={deleteAssessment} onSavePrep={savePrep} />;
  else
    page = <MePage data={data} demo={demo} onEditProfile={() => setSub("profile")} onMedCard={() => setSub("medcard")} onReplace={replaceAll} onClear={clearAll} onToggleDemo={toggleDemo} />;

  return (
    <div className="app">
      {demo && <div className="demo-bar no-print">演示模式：以下为虚构数据，与个人记录分开保存</div>}
      {!storageAvailable() && (
        <div className="alert no-print" role="alert">
          浏览器存储不可用，记录无法保存。请关闭隐私模式或允许网站存储。
        </div>
      )}
      {warning && (
        <div className="alert no-print" role="alert">
          {warning}
        </div>
      )}
      <main>{page}</main>
      <footer className="disclaimer">{DISCLAIMER}</footer>
      {!(sub === "profile" && onboarding) && (
        <nav className="tabbar no-print" aria-label="主导航">
          {(
            [
              ["record", "记录"],
              ["month", "汇总"],
              ["assess", "评估"],
              ["me", "我的"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button key={t} className={tab === t && !sub ? "on" : ""} aria-current={tab === t && !sub ? "page" : undefined} onClick={() => go(t)}>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
