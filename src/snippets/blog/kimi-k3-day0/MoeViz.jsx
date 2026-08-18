// MoeViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const MoeViz = ({ lang = "zh" }) => {
  const MOE = {
    title: {
      zh: "LatentMoE 图示",
      en: "LatentMoE diagram"
    },
    subtitle: {
      zh: "饼图只统计 routed pool；2 个 shared expert 不在这个分母里",
      en: "The pie covers only the routed pool; the 2 shared experts are outside this denominator"
    },
    routedActive: { zh: "每个 token 的 routed 选择", en: "Routed selection per token" },
    routedPercent: { zh: "只占 routed pool 的 1.8%", en: "Just 1.8% of the routed pool" },
    activeSlice: { zh: "本 token 选中的 routed experts", en: "routed experts selected for this token" },
    idleSlice: { zh: "本 token 未选中的 routed experts", en: "routed experts not selected for this token" },
    sharedTitle: { zh: "另有 2 个 shared experts", en: "Plus 2 shared experts" },
    sharedNote: {
      zh: "它们每个 token 都会经过，不参与 top-16 路由，也不属于 896 这个 routed pool。",
      en: "Every token passes through them. They do not join top-16 routing and are not part of the 896-expert routed pool."
    },
    statRouted: { zh: "routed 激活率（分母：896）", en: "routed activation (denominator: 896)" },
    statParams: { zh: "整模型参数激活率（另一分母）", en: "whole-model parameter activation (different denominator)" },
    statLatent: { zh: "expert 计算宽度", en: "expert compute width" },
    verdict: {
      zh: "每个 token 只选中 896 个 routed experts 中的 16 个。LatentMoE 在 3584 维隐空间中完成 expert 计算，再投影回 7168 维。",
      en: "Each token selects only 16 of 896 routed experts. LatentMoE runs expert computation in a 3584-d latent space, then projects back to 7168-d."
    }
  };

  const ROUTED_EXPERTS = 896;

  const ACTIVE_ROUTED = 16;

  const ROUTED_PERCENT = ACTIVE_ROUTED / ROUTED_EXPERTS * 100;
  const pieLabel = lang === "zh" ? `896 个 routed expert 中激活 16 个，占 ${ROUTED_PERCENT.toFixed(1)}%` : `${ACTIVE_ROUTED} of ${ROUTED_EXPERTS} routed experts are active, ${ROUTED_PERCENT.toFixed(1)}%`;
  return <figure className="viz-stage moe-static" style={{ margin: "1.6rem 0" }}>
      <div className="viz-head">
        <span className="viz-title">{MOE.title[lang]}</span>
      </div>

      <div className="moe-pie-only">
        <div className="moe-pie" role="img" aria-label={pieLabel}>
          <div className="moe-pie-center">
            <b>16</b>
            <span>/ 896</span>
            <small>{ROUTED_PERCENT.toFixed(1)}%</small>
          </div>
        </div>
      </div>
    </figure>;
}
