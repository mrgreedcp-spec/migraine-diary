import type { Profile } from "../types";
import { activeTriggers, buildClassCards, TRIGGER_LABEL, unsetProfileItems } from "../medInfo";

export function MedCardPage({ profile, onEditProfile, onDone }: { profile: Profile; onEditProfile: () => void; onDone: () => void }) {
  const triggers = activeTriggers(profile);
  const unset = unsetProfileItems(profile);
  const cards = buildClassCards(profile);
  const group = (role: "急性期" | "预防") => cards.filter((c) => c.cls.role === role);

  return (
    <section>
      <h1>用药沟通卡</h1>
      <div className="notice">
        <strong>这不是用药推荐。</strong>下面是常见偏头痛药物类别的通用资料，所有人看到的类别和顺序相同，不分先后。
        本应用不判断你该用哪种药、用多少。请带着这张卡问医生。
      </div>

      <div className="card">
        <h2>你的资料中，医生选药时会关心的情况</h2>
        {triggers.length ? (
          <ul className="tags">
            {triggers.map((t) => (
              <li key={t.trigger} className={t.uncertain ? "tag warn" : "tag"}>
                {TRIGGER_LABEL[t.trigger]}
                {t.uncertain ? "（不确定）" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">你没有填写会影响选药的情况。没填不等于没有。</p>
        )}
        {unset.length > 0 && <p className="muted">尚未填写：{unset.join("、")}。医生通常会问到。</p>}
        {profile.pastMigraineMeds.trim() && <p>你填写的既往用药：{profile.pastMigraineMeds}</p>}
        <button className="ghost small" onClick={onEditProfile}>
          修改资料
        </button>
      </div>

      {(["急性期", "预防"] as const).map((role) => (
        <div key={role}>
          <h2 className="section-h">{role === "急性期" ? "急性期（发作时）药物类别" : "预防药物类别"}</h2>
          {group(role).map(({ cls, points }) => (
            <article key={cls.id} className="card drug">
              <h3>{cls.name}</h3>
              <div className="muted">常见例子：{cls.examples}</div>
              <p>{cls.general}</p>
              {points.length > 0 ? (
                <div className="ask">
                  <div className="ask-h">结合你的资料，建议与医生确认：</div>
                  <ul>
                    {points.map((pt) => (
                      <li key={pt.label}>
                        <strong>
                          {pt.label}
                          {pt.uncertain ? "（不确定）" : ""}
                        </strong>
                        ：{pt.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="muted small">你的资料中没有与这类药相关的已填情况。是否适合仍需医生判断。</div>
              )}
            </article>
          ))}
        </div>
      ))}
      <p className="muted small">资料为通用公开信息整理，未经医学审核，不包含剂量。正式版本应替换为经医学审核的药物知识库。</p>
      <div className="actions">
        <button className="primary" onClick={onDone}>
          去记录今天
        </button>
      </div>
    </section>
  );
}
