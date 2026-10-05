import { useState } from "react";
import type { AppData, AssessmentRecord, TriOrUnset, VisitPrep } from "../types";
import { Choice, StatusLine, TextField, type Status } from "../components/ui";
import { gradeOf, latestAssessment } from "../rules";
import { validateScaleScore } from "../validate";
import { isValidDate, todayLocal } from "../dates";
import { uid } from "../defaults";
import type { SaveResult } from "../storage";

const NAME = { MIDAS: "MIDAS", HIT6: "HIT-6" } as const;

function ScaleForm({ type, onAdd }: { type: "MIDAS" | "HIT6"; onAdd: (a: AssessmentRecord) => SaveResult }) {
  const [completedOn, setCompletedOn] = useState(todayLocal());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [score, setScore] = useState("");
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState<Status>(null);

  function add() {
    const v = validateScaleScore(type, score);
    if (!v.ok) return setStatus({ kind: "error", text: v.error });
    if (!isValidDate(completedOn) || completedOn > todayLocal()) return setStatus({ kind: "error", text: "填写日期无效或在未来。" });
    if ((periodStart && !isValidDate(periodStart)) || (periodEnd && !isValidDate(periodEnd)) || (periodStart && periodEnd && periodEnd < periodStart))
      return setStatus({ kind: "error", text: "回顾区间日期无效。" });
    const r = onAdd({ id: uid(), type, completedOn, periodStart: periodStart || null, periodEnd: periodEnd || null, score: v.score, versionOrSource: src.trim() });
    if (!r.ok) return setStatus({ kind: "error", text: `保存失败：${r.error}` });
    setScore("");
    setStatus({ kind: "ok", text: "结果已保存" });
  }

  return (
    <details className="more">
      <summary>录入 {NAME[type]} 结果</summary>
      <TextField label="填写日期" type="date" value={completedOn} onChange={setCompletedOn} />
      {type === "MIDAS" && (
        <>
          <TextField label="回顾区间开始（可选）" type="date" value={periodStart} onChange={setPeriodStart} />
          <TextField label="回顾区间结束（可选）" type="date" value={periodEnd} onChange={setPeriodEnd} />
        </>
      )}
      <TextField label={`总分（${type === "MIDAS" ? "0–270 的整数" : "36–78 的整数"}）`} type="text" value={score} onChange={setScore} />
      <TextField label="版本／来源" placeholder="例如：医院提供的纸质版" value={src} onChange={setSrc} />
      <StatusLine status={status} />
      <button className="primary" onClick={add}>
        保存结果
      </button>
    </details>
  );
}

export function AssessPage({ data, onAdd, onDelete, onSavePrep }: { data: AppData; onAdd: (a: AssessmentRecord) => SaveResult; onDelete: (id: string) => SaveResult; onSavePrep: (p: VisitPrep) => SaveResult }) {
  const [prep, setPrep] = useState<VisitPrep>(data.prep);
  const [prepStatus, setPrepStatus] = useState<Status>(null);
  const triOpts: { value: TriOrUnset; label: string }[] = [
    { value: "yes", label: "是" },
    { value: "no", label: "否" },
    { value: "unknown", label: "说不清" },
  ];
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const list = [...data.assessments].sort((a, b) => b.completedOn.localeCompare(a.completedOn));

  return (
    <section>
      <h1>评估</h1>
      <h2 className="section-h">一、成熟量表结果录入</h2>
      <p className="muted small">本应用只录入你在医院或正规渠道完成的量表总分，不提供完整题目。分级表示生活影响程度，不对应任何具体药物。</p>
      {(["MIDAS", "HIT6"] as const).map((t) => {
        const last = latestAssessment(data.assessments, t);
        return (
          <div className="card" key={t}>
            <h3>{NAME[t]}</h3>
            <p className="muted small">
              {t === "MIDAS" ? "偏头痛残疾评估：回顾近 3 个月头痛对工作、家务和社交的影响天数。分级：0–5 很小或没有；6–10 轻度；11–20 中度；≥21 重度。" : "头痛影响测试：评估头痛对日常生活的影响。总分 36–78；≤49 很小或没有；50–55 有一定影响；56–59 较大；≥60 严重。"}
            </p>
            <div className="latest">
              最近一次：{last ? `${last.score} 分 · ${gradeOf(last)} · ${last.completedOn}` : <span className="muted">尚未录入</span>}
            </div>
            <ScaleForm type={t} onAdd={onAdd} />
          </div>
        );
      })}
      <div className="card">
        <h3>mTOQ（急性期治疗优化问卷）</h3>
        <p className="muted small">用于评估急性期治疗是否达到预期效果。完整问卷需取得授权和正规中文版本，本版暂不实现计分。</p>
      </div>
      {list.length > 0 && (
        <div className="card">
          <h3>全部量表记录</h3>
          <ul className="plain">
            {list.map((a) => (
              <li key={a.id} className="row-between">
                <span>
                  {a.completedOn} · {NAME[a.type]} {a.score} 分 · {gradeOf(a)}
                </span>
                {pendingDelete === a.id ? (
                  <button className="danger small" onClick={() => (onDelete(a.id), setPendingDelete(null))}>
                    确认删除
                  </button>
                ) : (
                  <button className="ghost small" onClick={() => setPendingDelete(a.id)}>
                    删除
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="section-h">二、就诊前情况整理表</h2>
      <div className="notice small">自编的信息整理表，不是经过验证的医学量表，不计分。</div>
      <div className="card">
        <Choice label="头痛是否明显影响你的生活？" value={prep.lifeImpact === "unset" ? null : prep.lifeImpact} options={triOpts} onChange={(v) => setPrep({ ...prep, lifeImpact: v })} />
        <Choice label="你对目前发作时的治疗效果不满意吗？" value={prep.acuteUnsatisfied === "unset" ? null : prep.acuteUnsatisfied} options={triOpts} onChange={(v) => setPrep({ ...prep, acuteUnsatisfied: v })} />
        <TextField label="这次就诊最想解决的问题" multiline value={prep.mainConcern} onChange={(v) => setPrep({ ...prep, mainConcern: v })} />
        <TextField label="你希望治疗达到什么目标" multiline value={prep.treatmentGoal} onChange={(v) => setPrep({ ...prep, treatmentGoal: v })} />
        <TextField label="想问医生的其他问题" multiline value={prep.ownQuestions} onChange={(v) => setPrep({ ...prep, ownQuestions: v })} />
        <StatusLine status={prepStatus} />
        <button
          className="primary"
          onClick={() => {
            const r = onSavePrep(prep);
            setPrepStatus(r.ok ? { kind: "ok", text: "整理表已保存" } : { kind: "error", text: `保存失败：${r.error}` });
          }}
        >
          保存整理表
        </button>
      </div>
    </section>
  );
}
