import { useRef, useState } from "react";
import type { AppData } from "../types";
import { validateAppData, type ImportCheck } from "../validate";
import { StatusLine, type Status } from "../components/ui";
import { todayLocal } from "../dates";
import { DISCLAIMER } from "../rules";
import type { SaveResult } from "../storage";

export function MePage({ data, demo, onEditProfile, onMedCard, onReplace, onClear, onToggleDemo }: {
  data: AppData;
  demo: boolean;
  onEditProfile: () => void;
  onMedCard: () => void;
  onReplace: (d: AppData) => SaveResult;
  onClear: () => SaveResult;
  onToggleDemo: () => void;
}) {
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasData = data.days.length > 0 || data.assessments.length > 0 || data.profile.savedAt !== null;

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `偏头痛记录备份_${demo ? "演示_" : ""}${todayLocal()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus({ kind: "ok", text: "备份文件已生成，请在下载文件夹中查看。" });
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    setFileName(f.name);
    try {
      const raw = JSON.parse(await f.text());
      setCheck(validateAppData(raw));
    } catch {
      setCheck({ ok: false, errors: ["文件不是有效的 JSON。"] });
    }
  }

  function confirmImport() {
    if (!check?.ok) return;
    const r = onReplace(check.data);
    setStatus(r.ok ? { kind: "ok", text: "导入完成，已替换本机数据。" } : { kind: "error", text: `导入失败，原数据未改动：${r.error}` });
    if (r.ok) {
      setCheck(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const [clearText, setClearText] = useState("");
  function clearAll() {
    if (clearText !== "清除") return setStatus({ kind: "error", text: "请先在输入框中输入“清除”。" });
    setClearText("");
    const r = onClear();
    setStatus(r.ok ? { kind: "ok", text: "本机数据已清除。" } : { kind: "error", text: `清除失败：${r.error}` });
  }

  return (
    <section>
      <h1>我的</h1>
      <div className="card">
        <button className="secondary block" onClick={onEditProfile}>
          编辑基础资料
        </button>
        <button className="secondary block" onClick={onMedCard}>
          查看用药沟通卡
        </button>
      </div>

      <div className="card">
        <h2>备份与恢复</h2>
        <p className="muted small">资料只保存在当前浏览器。清理浏览器数据可能丢失；不同设备之间不会自动同步。请定期下载备份。</p>
        <button className="primary block" onClick={exportJson}>
          下载 JSON 备份
        </button>
        <div className="field">
          <label className="field-label" htmlFor="import-file">
            导入 JSON 备份（替换当前数据）
          </label>
          <input id="import-file" ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        {check && !check.ok && (
          <div className="errors" role="alert">
            <strong>{fileName} 未通过校验，不会导入：</strong>
            <ul>
              {check.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {check?.ok && (
          <div className="notice">
            校验通过：{check.counts.days} 天记录、{check.counts.medications} 条用药、{check.counts.assessments} 条量表结果。
            {hasData && <div className="small">本机已有数据，导入将整体替换。建议先下载备份。</div>}
            <div className="actions">
              <button className="primary" onClick={confirmImport}>
                确认导入并替换
              </button>
              <button className="ghost" onClick={() => setCheck(null)}>
                取消
              </button>
            </div>
          </div>
        )}
        <StatusLine status={status} />
      </div>

      <div className="card">
        <h2>演示模式</h2>
        <p className="muted small">演示数据单独存放，不会混入你的个人记录。</p>
        <button className="secondary block" onClick={onToggleDemo}>
          {demo ? "退出演示模式，回到我的记录" : "进入演示模式"}
        </button>
      </div>

      <div className="card">
        <h2>清除本机数据</h2>
        <p className="muted small">会删除本机{demo ? "演示" : "全部"}资料、记录和草稿，无法恢复。</p>
        <div className="field">
          <label className="field-label" htmlFor="clear-confirm">
            输入“清除”确认
          </label>
          <input id="clear-confirm" value={clearText} onChange={(e) => setClearText(e.target.value)} />
        </div>
        <button className="danger block" onClick={clearAll}>
          清除{demo ? "演示" : "全部"}数据
        </button>
      </div>

      <div className="card">
        <h2>说明与医学来源</h2>
        <p>{DISCLAIMER}</p>
        <ul className="small">
          <li>不需要登录；无广告、无分析追踪、无远程 AI 请求；健康资料不放进网址。</li>
          <li>MIDAS、HIT-6 只录入总分。完整问卷需取得授权和正规中文版本后接入。</li>
          <li>“用药沟通卡”是通用资料整理，未经医学审核，不构成用药推荐。</li>
        </ul>
        <ul className="small sources">
          <li>
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3057423/" target="_blank" rel="noreferrer">量表验证研究（MIDAS／HIT-6 分级）</a>
          </li>
          <li>
            <a href="https://journals.sagepub.com/doi/full/10.1177/03331024241269735" target="_blank" rel="noreferrer">IHS 预防治疗建议</a>
          </li>
          <li>
            <a href="https://ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-2-medication-overuse-headache-moh/" target="_blank" rel="noreferrer">ICHD-3：药物过度使用性头痛诊断标准</a>
          </li>
          <li>
            <a href="https://americanmigrainefoundation.org/resource-library/migraine-in-the-emergency-department/" target="_blank" rel="noreferrer">AMF：何时需要急诊</a>
          </li>
          <li>
            <a href="https://ihs-headache.org/wp-content/uploads/2025/04/Clinical-Trials-Controlled-trials-of-preventive-treatment-of-migraine-attacks-in-episodic-migraine-in-adults-CEP.pdf" target="_blank" rel="noreferrer">IHS 临床试验指南（量表使用）</a>
          </li>
        </ul>
      </div>
    </section>
  );
}
