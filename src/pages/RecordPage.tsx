import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityImpact, AppData, DayRecord, MedicationRecord, Tri } from "../types";
import { FACTORS, IMPACT_LABEL, MED_CATEGORIES, PURPOSE_LABEL, RECOVERY_LABEL, RECURRENCE_LABEL, SYMPTOMS } from "../types";
import { Choice, Multi, PainScale, StatusLine, TextField, type Status } from "../components/ui";
import { emptyDay, emptyMed } from "../defaults";
import { formatCn, todayLocal } from "../dates";
import { validateDayForSave } from "../validate";
import { readKey, writeKey, type SaveResult } from "../storage";
import { EMERGENCY_MESSAGE } from "../rules";

const TRI3: { value: Tri; label: string }[] = [
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
  { value: "unknown", label: "不确定" },
];

function Emergency() {
  const [open, setOpen] = useState(false);
  const [ans, setAns] = useState<Record<number, "yes" | "no">>({});
  const qs = [
    "突然发生并迅速达到高峰的剧烈头痛",
    "新出现或明显不同于既往的肢体无力、说话异常、意识异常",
    "头痛伴高热或颈部僵硬",
  ];
  const anyYes = Object.values(ans).includes("yes");
  return (
    <div className="emergency">
      <button className="danger-outline" aria-expanded={open} onClick={() => setOpen(!open)}>
        ⚠ 出现异常症状？
      </button>
      {open && (
        <div className="card">
          <p>
            <strong>现在</strong>是否正在出现以下情况？（只问当前，与补录日期无关）
          </p>
          {qs.map((q, i) => (
            <Choice key={i} label={q} value={ans[i] ?? null} options={[{ value: "yes", label: "是" }, { value: "no", label: "否" }]} onChange={(v) => setAns({ ...ans, [i]: v })} />
          ))}
          {anyYes && (
            <div className="alert" role="alert">
              {EMERGENCY_MESSAGE}
            </div>
          )}
          <p className="muted small">这里不能判断危险是否已排除。拿不准时请及时就医。</p>
        </div>
      )}
    </div>
  );
}

function MedEditor({ med, onChange, onRemove, nameList, idx }: { med: MedicationRecord; onChange: (m: MedicationRecord) => void; onRemove: () => void; nameList: string[]; idx: number }) {
  const set = <K extends keyof MedicationRecord>(k: K, v: MedicationRecord[K]) => onChange({ ...med, [k]: v });
  const listId = `med-names-${med.id}`;
  return (
    <div className="med card inner">
      <div className="row-between">
        <strong>用药 {idx + 1}</strong>
        <button className="ghost small" onClick={onRemove}>
          删除这条
        </button>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`n-${med.id}`}>
          药名（必填）
        </label>
        <input id={`n-${med.id}`} list={listId} value={med.name} onChange={(e) => set("name", e.target.value)} placeholder="按药盒上的名字填写" />
        <datalist id={listId}>
          {nameList.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
      <Choice label="用药目的" value={med.purpose} options={(Object.keys(PURPOSE_LABEL) as MedicationRecord["purpose"][]).map((v) => ({ value: v, label: PURPOSE_LABEL[v] }))} onChange={(v) => set("purpose", v)} />
      <TextField label="实际服用量" placeholder="例如：1片" value={med.actualDose} onChange={(v) => set("actualDose", v)} />
      <details className="more">
        <summary>类别、时间与效果（可稍后补填）</summary>
        <div className="field">
          <label className="field-label" htmlFor={`c-${med.id}`}>
            药物类别
          </label>
          <select id={`c-${med.id}`} value={med.category} onChange={(e) => set("category", e.target.value)}>
            {MED_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="hint">不根据药名自动判断类别，请按药盒或医嘱选择。</div>
        </div>
        <TextField label="服药时间" type="time" value={med.takenAt ?? ""} onChange={(v) => set("takenAt", v || null)} />
        <PainScale label="服药后约2小时疼痛程度" allowNone value={med.painAt2h} onChange={(v) => set("painAt2h", v)} />
        <Choice label="是否恢复日常活动" value={med.activityRecovery} options={(Object.keys(RECOVERY_LABEL) as MedicationRecord["activityRecovery"][]).map((v) => ({ value: v, label: RECOVERY_LABEL[v] }))} onChange={(v) => set("activityRecovery", v)} />
        <Choice label="后续是否再次头痛" value={med.recurrence} options={(Object.keys(RECURRENCE_LABEL) as MedicationRecord["recurrence"][]).map((v) => ({ value: v, label: RECURRENCE_LABEL[v] }))} onChange={(v) => set("recurrence", v)} />
        <TextField label="副作用或不适" value={med.adverseEffects} onChange={(v) => set("adverseEffects", v)} />
      </details>
    </div>
  );
}

type Drafts = Record<string, DayRecord>;

export function RecordPage({ data, draftKey, onSaveDay }: { data: AppData; draftKey: string; onSaveDay: (d: DayRecord) => SaveResult }) {
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const existing = data.days.find((d) => d.date === date) ?? null;
  const [rec, setRec] = useState<DayRecord>(() => loadInitial(today));
  const [status, setStatus] = useState<Status>(null);
  const [errors, setErrors] = useState<string[]>([]);
  // 与“已保存/刚载入”的版本相同则不写草稿
  const baseline = useRef(JSON.stringify(rec));
  const [picked, setPicked] = useState(() => !!readKey<Drafts>(draftKey)?.[today] || data.days.some((d) => d.date === today));

  function loadInitial(d: string): DayRecord {
    const draft = readKey<Drafts>(draftKey)?.[d];
    if (draft) return draft;
    const ex = data.days.find((x) => x.date === d);
    return ex ? structuredClone(ex) : emptyDay(d);
  }

  function changeDate(d: string) {
    if (!d) return;
    setDate(d);
    const init = loadInitial(d);
    baseline.current = JSON.stringify(init);
    setRec(init);
    setPicked(!!readKey<Drafts>(draftKey)?.[d] || data.days.some((x) => x.date === d));
    setErrors([]);
    setStatus(null);
  }

  // 草稿自动保存（不进入统计）
  useEffect(() => {
    if (JSON.stringify(rec) === baseline.current) return;
    const drafts = readKey<Drafts>(draftKey) ?? {};
    drafts[rec.date] = rec;
    const r = writeKey(draftKey, drafts);
    setStatus(r.ok ? { kind: "draft", text: "草稿已保存（尚未提交，不计入统计）" } : { kind: "error", text: `草稿保存失败：${r.error}` });
  }, [rec, draftKey]);

  const nameList = useMemo(() => [...new Set(data.days.flatMap((d) => d.medications.map((m) => m.name.trim())).filter(Boolean))], [data.days]);
  const set = <K extends keyof DayRecord>(k: K, v: DayRecord[K]) => setRec((r) => ({ ...r, [k]: v }));
  const hasDraft = !!readKey<Drafts>(draftKey)?.[date];

  function submit() {
    const errs = validateDayForSave(rec, todayLocal());
    if (!picked) errs.unshift("请选择这一天有没有头痛。");
    setErrors(errs);
    if (errs.length) return setStatus({ kind: "error", text: "保存失败：请先处理下面的问题" });
    const toSave: DayRecord = {
      ...rec,
      id: existing?.id ?? rec.id,
      // 无头痛时清掉与头痛相关的数值，避免误入统计
      maxPain: rec.headache === "yes" ? rec.maxPain : null,
      medications: rec.medications.map((m) => ({ ...m, name: m.name.trim() })),
      updatedAt: new Date().toISOString(),
    };
    const r = onSaveDay(toSave);
    if (!r.ok) return setStatus({ kind: "error", text: `保存失败：${r.error}` });
    const drafts = readKey<Drafts>(draftKey) ?? {};
    delete drafts[date];
    writeKey(draftKey, drafts);
    baseline.current = JSON.stringify(toSave);
    setRec(structuredClone(toSave));
    setStatus({ kind: "ok", text: `记录已保存（${formatCn(date)}）` });
  }

  function discardDraft() {
    const drafts = readKey<Drafts>(draftKey) ?? {};
    delete drafts[date];
    writeKey(draftKey, drafts);
    const init = existing ? structuredClone(existing) : emptyDay(date);
    baseline.current = JSON.stringify(init);
    setRec(init);
    setPicked(!!existing);
    setStatus({ kind: "info", text: "已放弃草稿" });
  }

  return (
    <section>
      <div className="row-between">
        <h1>记录</h1>
      </div>
      <Emergency />
      <div className="card">
        <div className="field">
          <label className="field-label" htmlFor="rec-date">
            日期
          </label>
          <input id="rec-date" type="date" max={today} value={date} onChange={(e) => changeDate(e.target.value)} />
          <div className="hint">
            {date === today ? "今天" : "补录"}
            {existing ? " · 已有记录，保存会更新这一天" : " · 这一天还没有记录"}
            {hasDraft ? " · 有未提交草稿" : ""}
          </div>
        </div>
        <Choice
          big
          label="这一天有头痛吗？"
          value={picked ? rec.headache : null}
          options={[
            { value: "yes", label: "有头痛" },
            { value: "no", label: "没有头痛" },
            { value: "unknown", label: "不确定" },
          ]}
          onChange={(v) => {
            setPicked(true);
            set("headache", v);
          }}
        />
        {rec.headache === "yes" && (
          <>
            <PainScale label="当日最严重疼痛程度（必填）" value={rec.maxPain} onChange={(v) => set("maxPain", v)} />
            <Choice label="对活动的影响" value={rec.activityImpact} options={(Object.keys(IMPACT_LABEL) as ActivityImpact[]).map((v) => ({ value: v, label: IMPACT_LABEL[v] }))} onChange={(v) => set("activityImpact", v)} />
          </>
        )}
      </div>

      <div className="card">
        <div className="row-between">
          <h2>用药</h2>
          <span className="muted small">{rec.medications.length ? `${rec.medications.length} 条` : "未记录"}</span>
        </div>
        {rec.headache !== "yes" && <p className="muted small">没有头痛也可以记录用药，例如先兆阶段用了药。</p>}
        {rec.medications.map((m, i) => (
          <MedEditor key={m.id} idx={i} med={m} nameList={nameList} onChange={(nm) => set("medications", rec.medications.map((x) => (x.id === m.id ? nm : x)))} onRemove={() => set("medications", rec.medications.filter((x) => x.id !== m.id))} />
        ))}
        <button className="secondary" onClick={() => set("medications", [...rec.medications, emptyMed()])}>
          + 添加一条用药
        </button>
      </div>

      <details className="card more">
        <summary>补充详情（可选）</summary>
        {rec.headache === "yes" && (
          <>
            <Choice label="是否延续前一天的头痛" value={rec.continuesPreviousDay} options={TRI3} onChange={(v) => set("continuesPreviousDay", v)} />
            <TextField
              label="当天大致头痛时长（小时，0–24）"
              type="number"
              value={rec.durationHours === null ? "" : String(rec.durationHours)}
              onChange={(v) => set("durationHours", v === "" ? null : Number(v))}
            />
            <Multi label="伴随症状" value={rec.symptoms} options={SYMPTOMS} onChange={(v) => set("symptoms", v)} />
          </>
        )}
        <Choice label="先兆相关症状" value={rec.aura} options={[{ value: "yes", label: "有" }, { value: "no", label: "无" }, { value: "unknown", label: "不确定" }]} onChange={(v) => set("aura", v)} />
        {rec.aura === "yes" && <TextField label="先兆表现" value={rec.auraDescription} onChange={(v) => set("auraDescription", v)} />}
        <Choice label="是否处于月经期" value={rec.menstruation} options={TRI3} onChange={(v) => set("menstruation", v)} />
        <Multi label="可能相关因素" hint="相关因素是个人观察，不能据此确定因果关系。" value={rec.possibleFactors} options={FACTORS} onChange={(v) => set("possibleFactors", v)} />
        <TextField label="备注" multiline maxLength={1000} value={rec.notes} onChange={(v) => set("notes", v)} />
      </details>

      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <StatusLine status={status} />
      <div className="actions sticky">
        <button className="primary" onClick={submit}>
          {existing ? "更新这一天" : "保存记录"}
        </button>
        {hasDraft && (
          <button className="ghost" onClick={discardDraft}>
            放弃草稿
          </button>
        )}
      </div>
    </section>
  );
}
