import type { AppData } from "../types";
import { computeMonthStats, dayStatus, medFrequencyQuestion, preventionDiscussionReasons, type DayStatus } from "../rules";
import { daysInMonth, formatCn, monthRange, shiftMonth, todayLocal } from "../dates";

const STATUS_TEXT: Record<DayStatus, string> = { yes: "头痛", no: "无", unknown: "不定", missing: "未记", future: "" };

export function MonthPage({ data, ym, setYm, onSummary, onMedCard }: { data: AppData; ym: { year: number; month: number }; setYm: (v: { year: number; month: number }) => void; onSummary: () => void; onMedCard: () => void }) {
  const today = todayLocal();
  const { year, month } = ym;
  const s = computeMonthStats(data.days, year, month, today);
  const reasons = preventionDiscussionReasons(data);
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 周一为第一列
  const n = daysInMonth(year, month);
  const isFutureMonth = monthRange(year, month).start > today;

  return (
    <section>
      <h1>汇总</h1>
      <div className="month-switch">
        <button className="ghost" aria-label="上个月" onClick={() => setYm(shiftMonth(year, month, -1))}>
          ‹ 上月
        </button>
        <strong>
          {year}年{month}月
        </strong>
        <button className="ghost" aria-label="下个月" disabled={isFutureMonth} onClick={() => setYm(shiftMonth(year, month, 1))}>
          下月 ›
        </button>
      </div>
      <p className="muted small">
        统计区间：{formatCn(s.start)}–{s.expectedEnd ? formatCn(s.expectedEnd) : formatCn(s.end)}
        {s.expectedEnd && s.expectedEnd !== s.end ? "（截至今天）" : ""}
      </p>

      {s.recordedDays === 0 ? (
        <div className="empty">这个月还没有记录。</div>
      ) : (
        !s.complete && <div className="notice">以下统计仅覆盖已填写的日期。</div>
      )}

      <div className="stats">
        <Stat label="已记录／应记录" value={`${s.recordedDays}／${s.expectedDays}`} />
        <Stat label="有头痛" value={`${s.headacheDays} 天`} />
        <Stat label="没有头痛" value={`${s.noHeadacheDays} 天`} />
        <Stat label="不确定" value={`${s.unknownDays} 天`} />
        <Stat label="急性期用药" value={`${s.acuteMedDays} 天`} />
        <Stat label="停止部分活动或无法正常活动" value={`${s.impactedDays} 天`} />
        <Stat label="平均最严重疼痛" value={s.avgPain === null ? "未提供" : `${s.avgPain}／10`} sub={s.avgPain === null ? undefined : `样本 ${s.painSampleDays} 天`} />
      </div>

      <div className="card">
        <div className="cal" role="grid" aria-label={`${year}年${month}月记录月历`}>
          {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
            <div key={w} className="cal-h">
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {Array.from({ length: n }, (_, i) => {
            const date = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            const st = dayStatus(data.days, date, today);
            return (
              <div key={date} className={`cal-d st-${st}`} role="gridcell" aria-label={`${i + 1}日 ${STATUS_TEXT[st] || "未到"}`}>
                <span className="cal-n">{i + 1}</span>
                <span className="cal-s">{STATUS_TEXT[st]}</span>
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span className="lg st-yes">头痛＝有头痛</span>
          <span className="lg st-no">无＝无头痛</span>
          <span className="lg st-unknown">不定＝不确定</span>
          <span className="lg st-missing">未记＝未记录</span>
        </div>
      </div>

      {(s.acuteDaysByCategory.length > 0 || s.unknownPurposeMeds.length > 0) && (
        <div className="card">
          <h2>用药明细</h2>
          {s.acuteDaysByCategory.map((c) => (
            <div key={c.category}>
              急性期 · {c.category}：{c.days} 天
            </div>
          ))}
          {s.unknownPurposeMeds.length > 0 && (
            <>
              <div className="muted small">用药目的不确定（单独列示，未计入急性期用药天数）：</div>
              <ul>
                {s.unknownPurposeMeds.map(({ date, med }) => (
                  <li key={med.id}>
                    {date} {med.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2>建议与医生讨论</h2>
        {reasons.length > 0 && (
          <div className="notice">
            <strong>值得与医生讨论预防治疗。</strong>
            <ul>
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="small">这是讨论提示，不代表必须开始某种预防药物。</div>
          </div>
        )}
        <p>{medFrequencyQuestion(s.acuteMedDays)}</p>
      </div>

      <div className="actions">
        <button className="primary" onClick={onSummary}>
          生成就诊摘要
        </button>
        <button className="secondary" onClick={onMedCard}>
          用药沟通卡
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
      {sub && <div className="stat-l">{sub}</div>}
    </div>
  );
}
