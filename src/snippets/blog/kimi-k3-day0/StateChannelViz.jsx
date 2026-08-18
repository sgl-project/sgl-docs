// StateChannelViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const StateChannelViz = ({ lang = "zh" }) => {
  const COPY = {
    title: { zh: "Channel 图示", en: "Channel diagram" },
    hiddenLabel: { zh: "hidden state", en: "hidden state" },
    headLabel: { zh: "一个 head 的 k", en: "k for one head" },
    channelNote: { zh: "高亮的一维 = 一条 channel", en: "the highlighted dim = one channel" }
  };

  const KVEC_CELLS = 9;

  const SELECTED = 2;
  return <figure className="viz-stage" style={{ margin: "1.6rem 0" }}>
      <div className="viz-head">
        <span className="viz-title">{COPY.title[lang]}</span>
      </div>

      <div className="state-channel-flow">
        <section className="state-channel-step">
          <b>{COPY.hiddenLabel[lang]}</b>
          <div className="state-channel-hidden" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
          </div>
          <code>xₜ ∈ ℝ⁷¹⁶⁸</code>
        </section>

        <div className="state-channel-arrow" aria-hidden="true">
          <b>→</b>
          <code>Wₖ ∈ ℝ¹²⁸ˣ⁷¹⁶⁸</code>
        </div>

        <section className="state-channel-step">
          <b>{COPY.headLabel[lang]}</b>
          <div className="state-channel-kvec" role="img" aria-label={COPY.channelNote[lang]}>
            {Array.from({ length: KVEC_CELLS }, (_, i) => <span key={i} className={i === SELECTED ? "selected" : ""}>
                {i === SELECTED && <em>chⱼ</em>}
              </span>)}
            <i>…</i>
          </div>
          <code>kₜ ∈ ℝ¹²⁸</code>
          <small>{COPY.channelNote[lang]}</small>
        </section>
      </div>
    </figure>;
}
