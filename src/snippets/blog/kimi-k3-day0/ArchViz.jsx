// ArchViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const ArchViz = ({ lang = "zh" }) => {
  const ARCH = {
    title: { zh: "K3 整体结构", en: "K3 at a glance" },
    hint: { zh: "点击图中部件看说明", en: "Click a component for detail" },
    pathLabel: { zh: "高亮某条通路", en: "Highlight a pathway" },
    showAttnres: { zh: "AttnRes 取回", en: "AttnRes retrieval" },
    showResidual: { zh: "残差通路", en: "Residual path" },
    moduleMoe: { zh: "Stable LatentMoE 模块", en: "The Stable LatentMoE module" },
    moduleKda: { zh: "KDA 模块", en: "The KDA module" },
    moduleVision: { zh: "原生视觉通路", en: "Native vision pathway" },
    sharedExpert: { zh: "shared expert", en: "shared expert" },
    routedExpert: { zh: "routed expert", en: "routed expert" },
    blockPrev: { zh: "Block n−1", en: "Block n−1" },
    blockPrev2: { zh: "Block n−2", en: "Block n−2" },
    vision: { zh: "视觉", en: "vision" },
    projector: { zh: "投影", en: "projector" },
    text: { zh: "文本 token", en: "text tokens" },
    unitLabel: { zh: "4-layer unit（共四层）", en: "4-layer unit (4 layers total)" },
    repeat: {
      zh: "3 × 4-layer unit = 1 个 12-layer block",
      en: "3 × 4-layer units = one 12-layer block"
    },
    attnresArc: {
      zh: "AttnRes：pseudo-query 算出 α，跨 block 取回 embedding 与之前各 block 的输出",
      en: "AttnRes: a pseudo-query derives α over the embedding and preceding block outputs"
    },
    attnresSource: { zh: "Emb", en: "Emb" },
    attnresFeed: {
      zh: "α 送回 unit 内每个子层",
      en: "α feeds every sublayer in the unit"
    },
    blockCount: {
      zh: "B1–B7：各 12 层 · B8：末尾 9 层 · 共 93 层",
      en: "B1–B7: 12 layers each · B8: 9-layer tail · 93 layers total"
    },
    outLabel: { zh: "LM head", en: "LM head" }
  };

  const ARCH_DETAILS = [
    {
      id: "scale",
      label: { zh: "2.8T / 104B", en: "2.8T / 104B" },
      detail: {
        zh: "总参数 2.8T，每 token 激活 104B（≈3.7%）；原生 1M token 上下文。",
        en: "2.8T total parameters, 104B active per token (≈3.7%); native 1M-token context."
      }
    },
    {
      id: "mxfp4",
      label: { zh: "MXFP4", en: "MXFP4" },
      detail: {
        zh: "从 SFT 阶段起做量化感知训练：MoE expert 权重使用 MXFP4、输入激活使用 MXFP8；attention、LatentMoE projection、shared expert 和 router 等非 expert 模块保持更高精度。",
        en: "Quantization-aware training starts at SFT: MoE expert weights use MXFP4 and their input activations use MXFP8; non-expert modules such as attention, LatentMoE projections, shared experts, and routers stay at higher precision."
      }
    },
    {
      id: "vision",
      label: { zh: "MoonViT-V2", en: "MoonViT-V2" },
      detail: {
        zh: "K3 的原生视觉塔；图像和视频经过编码与轻量 projector 后进入共享 embedding 空间。",
        en: "K3's native vision tower; images and videos enter the shared embedding space through the encoder and a lightweight projector."
      }
    },
    {
      id: "embed",
      label: { zh: "Embedding（NoPE）", en: "Embedding (NoPE)" },
      detail: {
        zh: "全模型不加 RoPE。位置信息由 KDA 层的递归隐式提供，MLA 层做无位置编码的全局 attention。",
        en: "No RoPE anywhere. Position comes implicitly from the KDA recurrence; MLA layers run global attention without position encoding."
      }
    },
    {
      id: "kda",
      label: { zh: "KDA 层 ×69", en: "KDA layers ×69" },
      detail: {
        zh: "线性注意力：固定大小的递归状态，每步原地覆写，解码每步 O(1)。更新规则是 delta rule 加逐通道门控，下文展开。",
        en: "Linear attention: a fixed-size recurrent state overwritten in place, O(1) per decode step. The update rule is a delta rule with per-channel gating, covered below."
      }
    },
    {
      id: "mla",
      label: { zh: "MLA 层 ×24", en: "MLA layers ×24" },
      detail: {
        zh: "全局 softmax attention（带输出门），KV cache 随上下文增长；每 3 层 KDA 配 1 层，负责跨全文的信息交互。",
        en: "Global softmax attention (with an output gate); its KV cache grows with context. One per 3 KDA layers, providing full-context interaction."
      }
    },
    {
      id: "moe",
      label: { zh: "LatentMoE FFN", en: "LatentMoE FFN" },
      detail: {
        zh: "除首层 dense FFN 外，其余层从 896 个 routed expert 中选 16 个，另有 2 个 shared expert；路由和 expert 计算都在 3584 维隐空间进行。",
        en: "Except for the first dense FFN, each layer selects 16 of 896 routed experts plus 2 shared experts; routing and expert compute run in a 3584-d latent space."
      }
    },
    {
      id: "attnres",
      label: { zh: "AttnRes", en: "AttnRes" },
      detail: {
        zh: "每 12 层一组，组末用学到的 pseudo-query 对 embedding 和之前各组的输出算权重 α，按权重跨层取回。",
        en: "Every 12 layers form a group; a learned pseudo-query scores the embedding and all preceding groups' outputs and retrieves them by weight α."
      }
    }
  ];

  const ARCH_CALLOUTS = {
    scale: {
      zh: "2.8T 总参数，每 token 激活 104B",
      en: "2.8T total; 104B active per token"
    },
    mxfp4: {
      zh: "MoE expert 权重采用 MXFP4",
      en: "MoE expert weights use MXFP4"
    },
    vision: {
      zh: "图像与视频编码到共享表示空间",
      en: "Encodes images and video into shared representations"
    },
    embed: {
      zh: "NoPE；位置由 KDA 递归隐式提供",
      en: "NoPE; KDA recurrence supplies position implicitly"
    },
    kda: {
      zh: "固定状态的线性注意力，解码 O(1)",
      en: "Fixed-state linear attention with O(1) decode"
    },
    mla: {
      zh: "全局 softmax attention，负责跨全文交互",
      en: "Global softmax attention connects the full context"
    },
    moe: {
      zh: "每 token 路由 16 / 896 个 experts",
      en: "Routes each token to 16 of 896 experts"
    },
    attnres: {
      zh: "每 12 层保留摘要，按权重跨层取回",
      en: "Keeps 12-layer summaries for weighted retrieval"
    }
  };

  const WIDTH = 960;

  const HEIGHT = 700;

  const COL_X = 660;

  const TILE_W = 150;

  const TILE_H = 26;

  const ALPHA_X = 800;

  const SUBLAYERS = [
    { id: "moe", label: "Stable LatentMoE", y: 96, fill: "color-mix(in srgb, var(--series-2) 24%, var(--surface))" },
    { id: "mla", label: "Gated MLA", y: 164, fill: "color-mix(in srgb, var(--series-1) 34%, var(--surface))" },
    { id: "moe", label: "Stable LatentMoE", y: 232, fill: "color-mix(in srgb, var(--series-2) 24%, var(--surface))" },
    { id: "kda", label: "KDA", y: 300, fill: "var(--series-1)", textFill: "var(--accent-ink)" }
  ];

  const SOURCES = [
    { id: "blockPrev", y: 412 },
    { id: "blockPrev2", y: 446 },
    { id: "embed", y: 502 }
  ];
  const [active, setActive] = useState(null);
  const [showAttnres, setShowAttnres] = useState(false);
  const [showResidual, setShowResidual] = useState(false);
  const box = (x, y, w, h, label, opts = {}) => {
    const { id, fill = "var(--surface)", textFill = "var(--ink)", size = 10.5, dashed } = opts;
    const key = `${id ?? label}-${x}-${y}`;
    const detail = id ? ARCH_DETAILS.find((d) => d.id === id) : void 0;
    const clickable = Boolean(detail && id && id in ARCH_CALLOUTS);
    const selected = active?.key === key;
    return <g
      key={key}
      className={clickable ? "arch-clickable" : void 0}
      style={clickable ? { cursor: "pointer" } : void 0}
      onClick={clickable ? () => setActive({ id, key, x, y, width: w, height: h }) : void 0}
    >
        {detail && <title>{detail.detail[lang]}</title>}
        <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={6}
      className={`arch-tile${selected ? " is-selected" : ""}`}
      fill={fill}
      stroke={selected ? "var(--ink)" : "var(--border)"}
      strokeWidth={selected ? 2.6 : 1}
      strokeDasharray={dashed ? "4 3" : void 0}
    />
        <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" fontSize={size} fontWeight={600} fill={textFill}>
          {label}
        </text>
      </g>;
  };
  const trap = (x, y, w, h, label, narrowTop, fill) => {
    const inset = 12;
    const d = narrowTop ? `M ${x + inset} ${y} L ${x + w - inset} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z` : `M ${x} ${y} L ${x + w} ${y} L ${x + w - inset} ${y + h} L ${x + inset} ${y + h} Z`;
    return <g key={`${label}-${x}-${y}`}>
        <path d={d} fill={fill} stroke="var(--border)" strokeWidth="1" />
        <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" fontSize="9.5" fontWeight={600} fill="var(--ink)">
          {label}
        </text>
      </g>;
  };
  const node = (cx, cy, glyph, r = 9, strong = false) => <g key={`n-${cx}-${cy}-${glyph}`}>
      <circle
    cx={cx}
    cy={cy}
    r={r}
    fill="var(--surface)"
    stroke={strong ? "var(--ink)" : "var(--axis)"}
    strokeWidth={strong ? 1.8 : 1.2}
  />
      <text x={cx} y={cy + 3.6} textAnchor="middle" fontSize={r > 8 ? 11 : 9} fill="var(--ink-2)">
        {glyph}
      </text>
    </g>;
  const arrow = (x1, y1, x2, y2, opts = {}) => <line
    key={`a-${x1}-${y1}-${x2}-${y2}`}
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={opts.stroke ?? "var(--axis)"}
    strokeWidth={opts.width ?? 1.4}
    strokeDasharray={opts.dash}
    markerEnd="url(#arch-arrow)"
  />;
  const plain = (points, opts = {}) => <path
    key={`p-${points.slice(0, 24)}`}
    d={points}
    fill="none"
    stroke={opts.stroke ?? "var(--axis)"}
    strokeWidth={opts.width ?? 1.2}
    strokeDasharray={opts.dash}
  />;
  const attnresStroke = showAttnres ? "var(--series-2)" : "var(--axis)";
  const attnresWidth = showAttnres ? 1.8 : 1;
  const residualStroke = showResidual ? "var(--series-1)" : "var(--axis)";
  const residualWidth = showResidual ? 1.8 : 1;
  const selectionCallout = () => {
    if (!active) return null;
    const w = lang === "zh" ? 210 : 264;
    const h = 34;
    const topStrip = active.y < 40;
    const fitsLeft = !topStrip && active.x - 12 - w >= 8;
    const x = topStrip ? 290 : fitsLeft ? active.x - 12 - w : Math.min(WIDTH - w - 8, active.x + active.width + 12);
    const y = topStrip ? 6 : Math.max(6, Math.min(HEIGHT - h - 6, active.y + active.height / 2 - h / 2));
    return <g aria-live="polite">
        <line
      className="arch-callout-line"
      x1={fitsLeft ? active.x : active.x + active.width}
      y1={active.y + active.height / 2}
      x2={fitsLeft ? x + w : x}
      y2={y + h / 2}
    />
        <g className="arch-callout">
          <rect x={x} y={y} width={w} height={h} rx="9" />
          <text x={x + w / 2} y={y + 21} textAnchor="middle">
            {ARCH_CALLOUTS[active.id][lang]}
          </text>
        </g>
      </g>;
  };
  return <figure className="viz-stage" style={{ margin: "1.6rem 0" }}>
      <div className="viz-head">
        <span className="viz-title">{ARCH.title[lang]}</span>
      </div>

      <div className="viz-controls">
        <span className="viz-presets" role="group" aria-label={ARCH.pathLabel[lang]}>
          <button
    type="button"
    className={`viz-btn${showAttnres ? " primary" : ""}`}
    onClick={() => setShowAttnres((v) => !v)}
  >
            {ARCH.showAttnres[lang]}
          </button>
          <button
    type="button"
    className={`viz-btn${showResidual ? " primary" : ""}`}
    onClick={() => setShowResidual((v) => !v)}
  >
            {ARCH.showResidual[lang]}
          </button>
        </span>
        <span className="viz-hint">{ARCH.hint[lang]}</span>
      </div>

      <div className="viz-grid-wrap">
        <svg
    className="viz-grid"
    style={{ minWidth: 760 }}
    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    role="img"
    aria-label={ARCH.title[lang]}
  >
          <defs>
            <marker id="arch-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--axis)" />
            </marker>
          </defs>

          {
    /* ───────── 主干：一个 block 的子层链 ───────── */
  }
          <rect x="556" y="60" width="300" height="316" rx="12" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeDasharray="6 4" />
          <text x={COL_X} y="30" textAnchor="middle" fontSize="11" fontWeight={650} fill="var(--ink)">Output</text>

          {
    /* 主干竖线（自下而上） */
  }
          {plain(`M ${COL_X} 376 L ${COL_X} 52`, { width: 1.4 })}
          {arrow(COL_X, 44, COL_X, 36)}

          {
    /* 顶部：最后一次 AttnRes 取回作用在整块输出上 */
  }
          {box(770, 48, 24, 16, "w", { size: 9 })}
          {node(COL_X, 56, "α", 10, showAttnres)}
          {plain(`M 770 56 L ${COL_X + 10} 56`, { stroke: attnresStroke, width: attnresWidth })}

          {SUBLAYERS.map((layer, i) => {
    const cy = layer.y + TILE_H / 2;
    const plusY = layer.y - 20;
    return <g key={`${layer.id}-${i}`}>
                {box(COL_X - TILE_W / 2, layer.y, TILE_W, TILE_H, layer.label, {
      id: layer.id,
      fill: layer.fill,
      textFill: layer.textFill
    })}
                {
      /* 子层后的残差加法 */
    }
                {node(COL_X, plusY, "+")}
                {
      /* residual：绕过子层，从它的输入接到 ⊕ */
    }
                {plain(`M ${COL_X} ${layer.y + TILE_H + 10} L ${COL_X - 92} ${layer.y + TILE_H + 10} L ${COL_X - 92} ${plusY} L ${COL_X - 9} ${plusY}`, {
      stroke: residualStroke,
      width: residualWidth
    })}
                {
      /* 每个子层各有一条 pseudo-query → α → 取回 */
    }
                {box(ALPHA_X - 12, cy - 34, 24, 16, "w", { size: 9 })}
                {plain(`M ${ALPHA_X} ${cy - 18} L ${ALPHA_X} ${cy - 11}`, { stroke: attnresStroke, width: attnresWidth })}
                {node(ALPHA_X, cy, "α", 10, showAttnres)}
                {arrow(ALPHA_X - 11, cy, COL_X + TILE_W / 2, cy, { stroke: attnresStroke, width: attnresWidth })}
                {
      /* α 的输入来自 embedding 和之前各 block 的输出 */
    }
                {plain(`M ${ALPHA_X + 11} ${cy} L ${872 + i * 14} ${cy} L ${872 + i * 14} ${SOURCES[Math.min(i, 2)].y + 12} L 740 ${SOURCES[Math.min(i, 2)].y + 12}`, {
      stroke: attnresStroke,
      width: attnresWidth
    })}
              </g>;
  })}

          {
    /* 1× / 3×：报告的重复标记 */
  }
          {[
    { label: "1×", top: 90, bottom: 196 },
    { label: "3×", top: 226, bottom: 332 }
  ].map(({ label, top, bottom }) => <g key={label}>
              {plain(`M 536 ${top} L 528 ${top} L 528 ${bottom} L 536 ${bottom}`)}
              <text x="516" y={(top + bottom) / 2 + 4} textAnchor="middle" fontSize="12" fontWeight={650} fill="var(--ink-2)">
                {label}
              </text>
            </g>)}
          <text x={COL_X} y="366" textAnchor="middle" fontSize="13" fill="var(--muted)">⋮</text>

          {
    /* ───────── AttnRes 的取回来源 ───────── */
  }
          {SOURCES.map((s) => <g key={s.id}>
              {s.id === "embed" ? box(590, s.y, 150, 24, "Embedding", { id: "embed" }) : box(590, s.y, 150, 24, ARCH[s.id === "blockPrev" ? "blockPrev" : "blockPrev2"][lang], { size: 10 })}
            </g>)}
          <text x="665" y="482" textAnchor="middle" fontSize="13" fill="var(--muted)">⋮</text>
          {arrow(COL_X, 502, COL_X, 400)}

          {
    /* ───────── 右下：原生视觉通路 ───────── */
  }
          <rect x="576" y="548" width="180" height="132" rx="10" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeDasharray="6 4" />
          <text x="586" y="566" fontSize="9.5" fill="var(--muted)">{ARCH.moduleVision[lang]}</text>
          {box(600, 574, 132, 24, "MLP", { id: "projector", fill: "color-mix(in srgb, var(--series-2) 20%, var(--surface))" })}
          {box(600, 616, 132, 24, "MoonViT-V2", { id: "vision", fill: "color-mix(in srgb, var(--series-1) 26%, var(--surface))" })}
          {[0, 1, 2].map(
    (c) => [0, 1, 2].map((r) => <rect key={`px-${c}-${r}`} x={654 + c * 8} y={654 + r * 8} width="7" height="7" rx="1" fill="var(--grid)" stroke="var(--axis)" strokeWidth="0.6" />)
  )}
          {arrow(666, 654, 666, 642)}
          {arrow(666, 616, 666, 600)}
          {arrow(666, 574, 666, 528)}

          {
    /* ───────── 左上：Stable LatentMoE 模块 ───────── */
  }
          <rect x="20" y="60" width="470" height="240" rx="12" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeDasharray="6 4" />
          <text x="32" y="78" fontSize="9.5" fill="var(--muted)">{ARCH.moduleMoe[lang]}</text>
          {plain(`M 470 108 L 556 64`, { dash: "3 3" })}

          <rect x="352" y="96" width="12" height="12" rx="3" fill="color-mix(in srgb, var(--good) 26%, var(--surface))" stroke="var(--border)" strokeWidth="1" />
          <text x="370" y="106" fontSize="9" fill="var(--ink-2)">{ARCH.sharedExpert[lang]}</text>
          <rect x="352" y="116" width="12" height="12" rx="3" fill="color-mix(in srgb, var(--series-1) 22%, var(--surface))" stroke="var(--border)" strokeWidth="1" />
          <text x="370" y="126" fontSize="9" fill="var(--ink-2)">{ARCH.routedExpert[lang]}</text>

          {
    /* 输入 → router / 降维投影 */
  }
          {plain(`M 250 292 L 250 268`, { width: 1.4 })}
          {plain(`M 190 268 L 320 268`, { width: 1.4 })}
          {box(160, 244, 60, 22, "Router", { size: 9.5 })}
          {[0, 1, 2].map((i) => <rect key={`bar-${i}`} x={226 + i * 5} y={252 - i * 4} width="3.5" height={10 + i * 4} fill="var(--series-1)" opacity="0.75" />)}
          {trap(258, 244, 66, 22, "Linear", false, "color-mix(in srgb, var(--series-2) 20%, var(--surface))")}
          {arrow(190, 258, 190, 236)}
          {arrow(291, 244, 291, 236)}

          {
    /* shared 与 routed experts */
  }
          {box(96, 206, 26, 24, "1", { fill: "color-mix(in srgb, var(--good) 26%, var(--surface))", size: 10 })}
          {box(134, 206, 26, 24, "2", { fill: "color-mix(in srgb, var(--good) 26%, var(--surface))", size: 10 })}
          {box(206, 206, 26, 24, "1", { fill: "var(--surface)", textFill: "var(--muted)", size: 10, dashed: true })}
          {box(244, 206, 26, 24, "2", { fill: "color-mix(in srgb, var(--series-1) 22%, var(--surface))", size: 10 })}
          {box(282, 206, 26, 24, "3", { fill: "var(--surface)", textFill: "var(--muted)", size: 10, dashed: true })}
          <text x="326" y="222" textAnchor="middle" fontSize="11" fill="var(--muted)">⋯</text>
          {box(346, 206, 26, 24, "N", { fill: "color-mix(in srgb, var(--series-1) 22%, var(--surface))", size: 10 })}
          {plain(`M 219 206 L 219 196 L 359 196 L 359 206`, { dash: "3 3" })}
          {plain(`M 257 206 L 257 184`, { width: 1.4 })}
          {plain(`M 359 206 L 359 184 L 257 184`, { width: 1.4 })}

          {
    /* routed 分支：合并 → Norm → 升维投影 */
  }
          {node(257, 172, "+")}
          {box(224, 132, 66, 22, "Norm", { size: 9.5 })}
          {trap(224, 96, 66, 22, "Linear", true, "color-mix(in srgb, var(--series-2) 20%, var(--surface))")}
          {arrow(257, 163, 257, 154)}
          {arrow(257, 132, 257, 118)}
          {arrow(257, 96, 190, 92)}

          {
    /* shared 分支直接汇入顶部加法 */
  }
          {plain(`M 109 206 L 109 84 L 181 84`, { width: 1.4 })}
          {plain(`M 147 206 L 147 92 L 181 88`, { width: 1.4 })}
          {node(190, 84, "+")}
          {arrow(190, 75, 190, 66)}

          {
    /* ───────── 左下：KDA 模块 ───────── */
  }
          <rect x="20" y="330" width="470" height="330" rx="12" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeDasharray="6 4" />
          <text x="32" y="348" fontSize="9.5" fill="var(--muted)">{ARCH.moduleKda[lang]}</text>
          {plain(`M 470 452 L 556 352`, { dash: "3 3" })}

          {
    /* 输入分发到 q k / v / α / β / output gate */
  }
          {plain(`M 250 652 L 250 634`, { width: 1.4 })}
          {plain(`M 78 634 L 400 634`, { width: 1.4 })}
          {[78, 158, 238, 306, 380].map((x) => plain(`M ${x} 634 L ${x} 624`, { width: 1.4 }))}

          {box(48, 600, 60, 22, "Linear", { fill: "color-mix(in srgb, var(--series-2) 20%, var(--surface))", size: 9.5 })}
          {box(128, 600, 60, 22, "Linear", { fill: "color-mix(in srgb, var(--series-2) 20%, var(--surface))", size: 9.5 })}
          {trap(210, 600, 56, 22, "", true, "color-mix(in srgb, var(--good) 24%, var(--surface))")}
          {trap(280, 600, 52, 22, "", false, "color-mix(in srgb, var(--good) 18%, var(--surface))")}
          {box(350, 600, 60, 22, "Linear", { fill: "color-mix(in srgb, var(--series-2) 20%, var(--surface))", size: 9.5 })}

          {box(48, 560, 60, 22, "Conv", { size: 9.5 })}
          {box(128, 560, 60, 22, "Conv", { size: 9.5 })}
          {arrow(78, 600, 78, 582)}
          {arrow(158, 600, 158, 582)}
          {node(238, 574, "σ", 8)}
          {node(306, 574, "σ", 8)}
          {node(380, 574, "σ", 8)}
          {arrow(238, 600, 238, 582)}
          {arrow(306, 600, 306, 582)}
          {arrow(380, 600, 380, 582)}

          {node(78, 536, "⊘", 8)}
          {node(158, 536, "⊘", 8)}
          {arrow(78, 560, 78, 544)}
          {arrow(158, 560, 158, 544)}
          {box(58, 500, 40, 22, "L2", { size: 9.5 })}
          {arrow(78, 536, 78, 522)}

          {
    /* q k v α β 标签 */
  }
          {[
    { x: 70, t: "q" },
    { x: 92, t: "k" },
    { x: 158, t: "v" },
    { x: 238, t: "α" },
    { x: 306, t: "β" }
  ].map(({ x, t }) => <text key={t} x={x + (t === "v" || t === "α" || t === "β" ? 12 : 0)} y="490" textAnchor="middle" fontSize="10" fontStyle="italic" fontWeight={650} fill="var(--ink-2)">
              {t}
            </text>)}

          {box(48, 440, 264, 26, "Kimi Delta Attention", {
    id: "kda",
    fill: "color-mix(in srgb, var(--series-1) 26%, var(--surface))",
    size: 10.5
  })}
          {arrow(78, 500, 78, 466)}
          {arrow(158, 536, 158, 466)}
          {arrow(238, 566, 238, 466)}
          {arrow(306, 566, 306, 466)}

          {box(150, 400, 60, 22, "Norm", { size: 9.5 })}
          {arrow(180, 440, 180, 422)}
          {node(180, 380, "⊗")}
          {arrow(180, 400, 180, 389)}
          {
    /* output gate：右侧那条 σ 支路乘回主干 */
  }
          {plain(`M 380 566 L 380 380 L 189 380`, { width: 1.4 })}
          {box(150, 344, 60, 22, "Linear", { fill: "color-mix(in srgb, var(--series-2) 20%, var(--surface))", size: 9.5 })}
          {arrow(180, 371, 180, 366)}
          {arrow(180, 344, 180, 334)}

          {
    /* 规格胶囊：放左上空白处，说明气泡才不会压住 Output 和顶部的 w */
  }
          {box(20, 8, 132, 22, "2.8T / 104B", { id: "scale", size: 10 })}
          {box(164, 8, 96, 22, "MXFP4", { id: "mxfp4", size: 10 })}

          {selectionCallout()}
        </svg>
      </div>
    </figure>;
}
