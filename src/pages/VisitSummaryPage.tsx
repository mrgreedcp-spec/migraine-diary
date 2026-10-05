import { useState } from "react";
import type { AppData } from "../types";
import { buildSummary, summaryToText } from "../summary";
import { formatCn, shiftMonth, todayLocal } from "../dates";
import { DISCLAIMER } from "../rules";
import { StatusLine, type Status } from "../components/ui";

export function VisitSummaryPage({ data, ym, setYm, onBack }: { data: AppData; ym: { year: number; month: number }; setYm: (v: { year: number; month: number }) => void; onBack: () => void }) {
  const today = todayLocal();
  const sections = buildSummary(data, ym.year, ym.month, today);
  const [status, setStatus] = useState<Status>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryToText(sections, formatCn(today)));
      setStatus({ kind: "ok", text: "摘要已复制" });
    } catch {
      setStatus({ kind: "error", text: "复制失败，请手动选择文字复制。" });
    }
  }

  return (
    <section className="summary-page">
      <div className="no-print">
        <button className="ghost" onClick={onBack}>
          ‹ 返回汇总
        </button>
        <div className="month-switch">
          <button className="ghost" onClick={() => setYm(shiftMonth(ym.year, ym.month, -1))}>
            ‹ 上月
          </button>
          <strong>
            {ym.year}年{ym.month}月
          </strong>
          <button className="ghost" onClick={() => setYm(shiftMonth(ym.year, ym.month, 1))}>
            下月 ›
          </button>
        </div>
      </div>
      <article className="doc">
        <h1>偏头痛就诊摘要</h1>
        <div className="muted small">生成日期：{formatCn(today)} · {DISCLAIMER}</div>
        {sections.map((s) => (
          <div key={s.title} className="doc-sec">
            <h2>{s.title}</h2>
            <ul>
              {s.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </article>
      <StatusLine status={status} />
      <div className="actions no-print">
        <button className="primary" onClick={() => window.print()}>
          打印／另存为 PDF
        </button>
        <button className="secondary" onClick={copy}>
          复制文字
        </button>
      </div>
    </section>
  );
}
