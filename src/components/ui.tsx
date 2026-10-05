import { useId, type ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {hint && <div className="hint">{hint}</div>}
      {children}
    </div>
  );
}

/** 单选按钮组（原生 radio，键盘可用） */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  big,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
  big?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      {hint && <div className="hint">{hint}</div>}
      <div className={big ? "choices big" : "choices"}>
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? "chip on" : "chip"}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Multi({ label, value, options, onChange, hint }: { label: string; value: string[]; options: readonly string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      {hint && <div className="hint">{hint}</div>}
      <div className="choices">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <label key={o} className={on ? "chip on" : "chip"}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 0–10 疼痛评分，不默认选中；allowNone 时多一个“未观察” */
export function PainScale({ label, value, onChange, allowNone, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; allowNone?: boolean; hint?: string }) {
  const name = useId();
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      {hint && <div className="hint">{hint}</div>}
      <div className="pain">
        {Array.from({ length: 11 }, (_, i) => (
          <label key={i} className={value === i ? "pain-btn on" : "pain-btn"}>
            <input type="radio" name={name} checked={value === i} onChange={() => onChange(i)} />
            {i}
          </label>
        ))}
        {allowNone && (
          <label className={value === null ? "chip on" : "chip"}>
            <input type="radio" name={name} checked={value === null} onChange={() => onChange(null)} />
            未观察
          </label>
        )}
      </div>
      <div className="pain-legend">
        <span>0 不痛</span>
        <span>10 能想象的最痛</span>
      </div>
    </fieldset>
  );
}

export function TextField({ label, value, onChange, multiline, maxLength, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; maxLength?: number; placeholder?: string; type?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea id={id} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <input id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {maxLength && <div className="hint right">{value.length}／{maxLength}</div>}
    </div>
  );
}

export type Status = { kind: "ok" | "draft" | "error" | "info"; text: string } | null;
export function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  const icon = { ok: "✓", draft: "•", error: "✕", info: "i" }[status.kind];
  return (
    <div className={`status ${status.kind}`} role={status.kind === "error" ? "alert" : "status"}>
      <span aria-hidden>{icon}</span> {status.text}
    </div>
  );
}
