import type { AppData } from "./types";
import { emptyData } from "./defaults";
import { validateAppData } from "./validate";

export const DATA_KEY = "migraine-diary-v1";
export const DRAFT_KEY = "migraine-diary-draft-v1";
export const DEMO_KEY = "migraine-diary-demo-v1";

export type SaveResult = { ok: true } | { ok: false; error: string };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 写入后回读校验，只有回读一致才算保存成功 */
export function writeKey(key: string, value: unknown): SaveResult {
  const s = storage();
  if (!s) return { ok: false, error: "浏览器存储不可用（可能是隐私模式或已禁用存储）。" };
  const text = JSON.stringify(value);
  try {
    s.setItem(key, text);
    if (s.getItem(key) !== text) return { ok: false, error: "写入后读取不一致。" };
    return { ok: true };
  } catch (e) {
    const full = e instanceof DOMException && /quota/i.test(e.name + e.message);
    return { ok: false, error: full ? "浏览器存储空间已满。" : "浏览器拒绝写入。" };
  }
}

export function readKey<T>(key: string): T | null {
  const s = storage();
  if (!s) return null;
  try {
    const t = s.getItem(key);
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return null;
  }
}

export function removeKey(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadData(key = DATA_KEY): { data: AppData; warning: string | null } {
  const raw = readKey<unknown>(key);
  if (raw == null) return { data: emptyData(), warning: null };
  const v = validateAppData(raw);
  if (v.ok) return { data: v.data, warning: null };
  writeKey(key + "-unreadable-backup", raw);
  return { data: emptyData(), warning: "本机已存数据无法读取，已以空白状态打开；原数据已另存为备份键。" };
}

export function storageAvailable(): boolean {
  return storage() !== null;
}
