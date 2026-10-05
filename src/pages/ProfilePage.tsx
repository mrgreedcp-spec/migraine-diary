import { useState } from "react";
import type { Profile, TriOrUnset } from "../types";
import { CONDITIONS } from "../types";
import { Choice, Multi, TextField, StatusLine, type Status } from "../components/ui";
import type { SaveResult } from "../storage";

const TRI_OPTS: { value: TriOrUnset; label: string }[] = [
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
  { value: "unknown", label: "不确定" },
];

export function ProfilePage({ initial, onSave, onboarding, onSkip }: { initial: Profile; onSave: (p: Profile) => SaveResult; onboarding: boolean; onSkip?: () => void }) {
  const [p, setP] = useState<Profile>(initial);
  const [ageText, setAgeText] = useState(initial.age === null ? "" : String(initial.age));
  const [status, setStatus] = useState<Status>(null);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const unsetNote = (v: TriOrUnset) => (v === "unset" ? "当前：未填写" : undefined);

  function submit() {
    let age: number | null = null;
    if (ageText.trim()) {
      const n = Number(ageText);
      if (!Number.isInteger(n) || n < 1 || n > 120) return setStatus({ kind: "error", text: "年龄应为 1–120 的整数，或留空。" });
      age = n;
    }
    const r = onSave({ ...p, age, savedAt: new Date().toISOString() });
    setStatus(r.ok ? { kind: "ok", text: "资料已保存" } : { kind: "error", text: `保存失败：${r.error}` });
  }

  return (
    <section>
      <h1>{onboarding ? "先填基本情况" : "基础资料"}</h1>
      <p className="lead">这些信息会进入就诊摘要，也用来列出“需要与医生确认的用药问题”。不填的项目保持“未填写”。</p>
      <div className="card">
        <TextField label="年龄" type="number" value={ageText} onChange={setAgeText} />
        <Choice label="是否经医生确诊偏头痛" value={p.diagnosed === "unset" ? null : p.diagnosed} options={TRI_OPTS} onChange={(v) => set("diagnosed", v)} hint={unsetNote(p.diagnosed)} />
        <Choice label="是否备孕" value={p.tryingToConceive === "unset" ? null : p.tryingToConceive} options={TRI_OPTS} onChange={(v) => set("tryingToConceive", v)} hint={unsetNote(p.tryingToConceive)} />
        <Choice label="是否怀孕" value={p.pregnant === "unset" ? null : p.pregnant} options={TRI_OPTS} onChange={(v) => set("pregnant", v)} hint={unsetNote(p.pregnant)} />
        <Choice label="是否哺乳" value={p.breastfeeding === "unset" ? null : p.breastfeeding} options={TRI_OPTS} onChange={(v) => set("breastfeeding", v)} hint={unsetNote(p.breastfeeding)} />
        <Multi label="已知疾病（可多选）" value={p.conditions} options={CONDITIONS} onChange={(v) => set("conditions", v)} hint={p.conditions.length ? undefined : "当前：未填写"} />
        {p.conditions.includes("其他") && <TextField label="其他疾病" value={p.conditionsOther} onChange={(v) => set("conditionsOther", v)} />}
        <details className="more">
          <summary>更多资料（可选）</summary>
          <TextField label="头痛开始的大致时间" placeholder="例如：上大学时" value={p.onset} onChange={(v) => set("onset", v)} />
          <TextField label="药物过敏或不耐受" multiline value={p.allergies} onChange={(v) => set("allergies", v)} />
          <TextField label="当前长期使用的药物" multiline value={p.longTermMeds} onChange={(v) => set("longTermMeds", v)} />
          <TextField label="曾用过的偏头痛药物及停用原因" multiline value={p.pastMigraineMeds} onChange={(v) => set("pastMigraineMeds", v)} />
        </details>
      </div>
      <StatusLine status={status} />
      <div className="actions">
        <button className="primary" onClick={submit}>
          {onboarding ? "保存，查看用药沟通卡" : "保存资料"}
        </button>
        {onboarding && onSkip && (
          <button className="ghost" onClick={onSkip}>
            先跳过
          </button>
        )}
      </div>
    </section>
  );
}
