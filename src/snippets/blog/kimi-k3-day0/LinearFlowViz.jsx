// LinearFlowViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const LinearFlowViz = ({ lang = "zh" }) => {
  const MHA = {
    title: {
      zh: "MHA 图示",
      en: "MHA diagram"
    },
    statCache: { zh: "cache", en: "cache" },
    cells: { zh: "格", en: "cells" },
    statDot: { zh: "本步点积", en: "dot products this step" },
    statTotal: { zh: "累计", en: "cumulative" },
    times: { zh: "次", en: "" },
    legendCell: {
      zh: "cache 一格 = 一个 token 的 KV",
      en: "one cache cell = one token's KV"
    },
    legendLine: { zh: "连线 = 一次点积（线宽 = softmax 权重）", en: "line = one dot product (width = softmax weight)" },
    legendCurrent: { zh: "描边 = 当前 token", en: "outline = current token" }
  };

  const MHA_TOKENS = {
    zh: [
      { text: "猫" },
      { text: "追", focus: [[0, 0.55]] },
      { text: "老鼠", focus: [[1, 0.4], [0, 0.2]] },
      { text: "，" },
      { text: "因为" },
      { text: "它", focus: [[0, 0.72], [2, 0.15]] },
      { text: "饿", focus: [[5, 0.45], [0, 0.25]] },
      { text: "了" }
    ],
    en: [
      { text: "The" },
      { text: "cat" },
      { text: "chased", focus: [[1, 0.55]] },
      { text: "the" },
      { text: "mouse", focus: [[2, 0.4], [1, 0.2]] },
      { text: "because" },
      { text: "it", focus: [[1, 0.72], [4, 0.15]] },
      { text: "was" },
      { text: "hungry", focus: [[6, 0.45], [1, 0.25]] }
    ]
  };

  const mhaCellTooltip = (locale, pos, word, weight) => {
    const zh = locale === "zh";
    const base = zh ? `位置 ${pos} ·「${word}」的 KV` : `position ${pos} · KV of "${word}"`;
    if (weight === null) return base;
    return zh ? `${base} · 本步权重 ${weight.toFixed(2)}` : `${base} · weight ${weight.toFixed(2)} this step`;
  }

  const mhaChip = (locale, word) => {
    return locale === "zh" ? `「${word}」` : `"${word}"`;
  }

  const LINFLOW = {
    title: {
      zh: "Naive linear attention 图示",
      en: "Naive linear attention diagram"
    },
    statState: { zh: "状态大小 常数", en: "state size constant" },
    statStep: { zh: "本步计算 常数", en: "per-step compute constant" },
    statCum: { zh: "累计", en: "cumulative" },
    statMha: { zh: "MHA 对照：cache", en: "MHA for comparison: cache" },
    statMhaCum: { zh: "格，累计点积", en: "cells, cumulative dot products" },
    sLabel: { zh: "S（固定大小）", en: "S (fixed size)" },
    legendToken: {
      zh: "token（颜色仅用于看它们在 S 里混合）",
      en: "token (colors only to watch them blend inside S)"
    },
    legendStripe: { zh: "S 的条纹 = 已叠加的历史", en: "stripes in S = superimposed history" },
    legendWrite: { zh: "实线 = 写入 S", en: "solid = write into S" },
    legendRead: { zh: "虚线 = 从 S 读出", en: "dashed = read from S" }
  };

  const linflowBoxTooltip = (locale, count) => {
    return locale === "zh" ? `状态 S：${count} 个 token 的 k·vᵀ 叠加，大小固定(K3 为 128×128/head)` : `State S: the superposition of ${count} tokens' k·vᵀ, fixed size (128×128 per K3 head)`;
  }

  const PLAYER_UI = {
    play: { zh: "▶ 播放", en: "▶ Play" },
    pause: { zh: "⏸ 暂停", en: "⏸ Pause" },
    replay: { zh: "↻ 重播", en: "↻ Replay" },
    stepBack: { zh: "上一步", en: "Step back" },
    stepForward: { zh: "下一步", en: "Step forward" },
    toStart: { zh: "回到开头", en: "Back to start" },
    timeline: { zh: "时间轴", en: "Timeline" },
    speed: { zh: "播放速度", en: "Playback speed" }
  };

  const seriesColor = (id) => {
    return `var(--series-${(id - 1) % 8 + 1})`;
  }

  const useSimPlayer = (total, baseIps = 2.5) => {
    const [t, setT] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const fraction = useRef(0);
    useEffect(() => {
      if (!playing) return;
      let raf = 0;
      let last = performance.now();
      const MAX_FRAME_SECONDS = 0.25;
      const frame = (now) => {
        const dt = Math.min((now - last) / 1e3, MAX_FRAME_SECONDS);
        fraction.current += dt * baseIps * speed;
        last = now;
        if (fraction.current >= 1) {
          const n = Math.floor(fraction.current);
          fraction.current -= n;
          setT((prev) => Math.min(prev + n, total));
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }, [playing, speed, total, baseIps]);
    useEffect(() => {
      if (t >= total) setPlaying(false);
    }, [t, total]);
    const toggle = useCallback(() => {
      if (!playing && t >= total) {
        setT(0);
        fraction.current = 0;
      }
      setPlaying(!playing);
    }, [playing, t, total]);
    const reset = useCallback(() => {
      setPlaying(false);
      setT(0);
      fraction.current = 0;
    }, []);
    const stepBy = useCallback(
      (delta) => {
        setPlaying(false);
        fraction.current = 0;
        setT((prev) => Math.max(0, Math.min(prev + delta, total)));
      },
      [total]
    );
    const seek = useCallback(
      (next) => {
        setPlaying(false);
        fraction.current = 0;
        setT(Math.max(0, Math.min(Math.round(next), total)));
      },
      [total]
    );
    return { t, total, playing, speed, toggle, reset, stepBy, seek, setSpeed };
  }

  const Legend = useMemo(() => ({ items }) => {
    return <div className="viz-legend" role="list">
        {items.map((item) => <span className="viz-legend-item" role="listitem" key={item.label}>
            <span className="viz-swatch" style={item.swatch} />
            {item.label}
          </span>)}
      </div>;
  }, []);

  const SPEEDS = [0.5, 1, 2, 4];

  const VizStage = useMemo(() => ({
    title,
    subtitle,
    player,
    lang = "zh",
    headExtra,
    children,
    footer
  }) => {
    const { t, total, playing } = player;
    return <figure className="viz-stage" style={{ margin: "1.6rem 0" }}>
        <div className="viz-head">
          <span className="viz-title">{title}</span>
          {subtitle && <span className="viz-subtitle">{subtitle}</span>}
          {headExtra && <span className="viz-head-extra">{headExtra}</span>}
        </div>

        {children}

        <div className="viz-controls">
          <button
      type="button"
      className="viz-btn primary"
      onClick={player.toggle}
      aria-label={playing ? PLAYER_UI.pause[lang] : PLAYER_UI.play[lang]}
    >
            {playing ? PLAYER_UI.pause[lang] : t >= total ? PLAYER_UI.replay[lang] : PLAYER_UI.play[lang]}
          </button>
          <button
      type="button"
      className="viz-btn"
      onClick={() => player.stepBy(-1)}
      disabled={t === 0}
      aria-label={PLAYER_UI.stepBack[lang]}
    >
            ◀
          </button>
          <button
      type="button"
      className="viz-btn"
      onClick={() => player.stepBy(1)}
      disabled={t >= total}
      aria-label={PLAYER_UI.stepForward[lang]}
    >
            ▶
          </button>
          <button
      type="button"
      className="viz-btn"
      onClick={player.reset}
      disabled={t === 0}
      aria-label={PLAYER_UI.toStart[lang]}
    >
            ⏮
          </button>
          <input
      type="range"
      className="viz-scrub"
      min={0}
      max={total}
      step={1}
      value={t}
      onChange={(e) => player.seek(Number(e.target.value))}
      aria-label={PLAYER_UI.timeline[lang]}
    />
          <span className="viz-tick">
            t = {t}/{total}
          </span>
          <select
      className="viz-speed"
      value={player.speed}
      onChange={(e) => player.setSpeed(Number(e.target.value))}
      aria-label={PLAYER_UI.speed[lang]}
    >
            {SPEEDS.map((s) => <option key={s} value={s}>
                {s}×
              </option>)}
          </select>
        </div>

        {footer && <div className="viz-footer">{footer}</div>}
      </figure>;
  }, []);

  const INV_SQRT2 = Math.SQRT1_2;

  const KEY_A = [INV_SQRT2, INV_SQRT2];

  const KEY_B = [INV_SQRT2, -INV_SQRT2];

  const kcdFormat = (value) => {
    const rounded = Number(value.toFixed(2));
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }

  const stateRead = (terms, query) => {
    return terms.reduce((total, term) => {
      const scale = term.rowScale ?? [1, 1];
      return total + term.scalar * (query[0] * term.vector[0] * scale[0] + query[1] * term.vector[1] * scale[1]);
    }, 0);
  }

  const TokenTimeline = useMemo(() => ({ items, t }) => {
    return <div className="key-token-timeline" aria-label="token sequence">
        {items.map((item, index) => {
      const seen = index < t;
      const current = index === t - 1;
      return <div className={`key-token${current ? " current" : ""}`} key={`${item.label}-${index}`}>
              <span
        className={item.kind === "query" ? "query" : "write"}
        style={seen && item.kind === "write" ? { background: seriesColor(item.color) } : void 0}
      />
              <b>{seen ? item.label : ""}</b>
            </div>;
    })}
      </div>;
  }, []);

  const KeySpacePanel = useMemo(() => ({ lang }) => {
    return <div className="key-space-panel">
        <div className="channel-state-title">
          {lang === "zh" ? "二维 key 空间（教学切片）" : "2D key space (teaching slice)"}
        </div>
        <svg viewBox="0 0 230 180" role="img" aria-label={lang === "zh" ? "A 和 B 是横跨两个 channel 的完整 key 方向" : "A and B are full key directions spanning both channels"}>
          <defs>
            <marker id="key-plane-a-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--series-1)" /></marker>
            <marker id="key-plane-b-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--series-2)" /></marker>
          </defs>
          <line x1="24" y1="90" x2="216" y2="90" stroke="var(--axis)" strokeWidth="1.5" />
          <line x1="115" y1="164" x2="115" y2="16" stroke="var(--axis)" strokeWidth="1.5" />
          <text x="198" y="82" fill="var(--muted)" fontSize="11">ch₁</text>
          <text x="123" y="25" fill="var(--muted)" fontSize="11">ch₂</text>
          <line x1="115" y1="90" x2="184" y2="31" stroke="var(--series-1)" strokeWidth="5" strokeLinecap="round" markerEnd="url(#key-plane-a-arrow)" />
          <line x1="115" y1="90" x2="184" y2="149" stroke="var(--series-2)" strokeWidth="5" strokeLinecap="round" markerEnd="url(#key-plane-b-arrow)" />
          <text x="171" y="24" fill="var(--ink)" fontSize="12" fontWeight="700">kₐ</text>
          <text x="171" y="167" fill="var(--ink)" fontSize="12" fontWeight="700">kᵦ</text>
          <circle cx="115" cy="90" r="4" fill="var(--ink)" />
        </svg>
        <div className="key-space-equations">
          <code>kₐ=(1/√2)[1,1]ᵀ</code>
          <code>kᵦ=(1/√2)[1,−1]ᵀ</code>
        </div>
        <small>{lang === "zh" ? "箭头 = 完整 key；坐标轴 = channels" : "arrows = full keys; axes = channels"}</small>
      </div>;
  }, []);

  const rowContributions = (terms, row) => {
    return terms.map((term) => ({
      id: `${term.id}-${row}`,
      label: term.label,
      value: term.scalar * term.vector[row] * (term.rowScale?.[row] ?? 1),
      color: term.color
    })).filter((term) => Math.abs(term.value) > 1e-4);
  }

  const SignedContributionBar = useMemo(() => ({ contributions, maxAbs = 6 }) => {
    let positive = 0;
    let negative = 0;
    const total = contributions.reduce((sum, item) => sum + item.value, 0);
    return <div className="channel-signed-track">
        <span className="channel-zero" />
        {contributions.map((item) => {
      const magnitude = Math.abs(item.value);
      const width = Math.min(49, magnitude / maxAbs * 49);
      let left;
      if (item.value >= 0) {
        left = 50 + positive / maxAbs * 49;
        positive += magnitude;
      } else {
        negative += magnitude;
        left = 50 - negative / maxAbs * 49;
      }
      return <span
        className="channel-contribution"
        key={item.id}
        style={{ left: `${left}%`, width: `${width}%`, background: seriesColor(item.color) }}
        title={`${item.label}: ${kcdFormat(item.value)}`}
      />;
    })}
        <i className="channel-total-marker" style={{ left: `${50 + Math.max(-49, Math.min(49, total / maxAbs * 49))}%` }} />
      </div>;
  }, []);

  const ContributionCallouts = useMemo(() => ({ contributions }) => {
    if (!contributions.length) return null;
    return <div className="channel-row-callouts">
        {contributions.map((item) => {
      const color = seriesColor(item.color);
      return <span className="channel-callout" key={`callout-${item.id}`} style={{ borderColor: color }}>
              <i className="channel-callout-line" style={{ background: color }} />
              <i className="channel-callout-dot" style={{ background: color }} />
              <b>{item.label}</b>
              <em>{item.value >= 0 ? "+" : ""}{kcdFormat(item.value)}</em>
            </span>;
    })}
      </div>;
  }, []);

  const ChannelStatePanel = useMemo(() => ({
    title,
    terms,
    lang,
    accent = false,
    note,
    maxAbs = 6
  }) => {
    const rows = [rowContributions(terms, 0), rowContributions(terms, 1)];
    const totals = rows.map((row) => row.reduce((sum, item) => sum + item.value, 0));
    return <div className={`channel-state-panel${accent ? " accent" : ""}`}>
        <div className="channel-state-title">{title}</div>
        <div className="channel-state-row">
          <b>ch₁</b>
          <div className="channel-row-visual">
            <SignedContributionBar contributions={rows[0]} maxAbs={maxAbs} />
            <ContributionCallouts contributions={rows[0]} />
          </div>
          <output>{kcdFormat(totals[0])}</output>
        </div>
        <div className="channel-state-row">
          <b>ch₂</b>
          <div className="channel-row-visual">
            <SignedContributionBar contributions={rows[1]} maxAbs={maxAbs} />
            <ContributionCallouts contributions={rows[1]} />
          </div>
          <output>{kcdFormat(totals[1])}</output>
        </div>
        <div className="channel-state-axis"><span>−</span><span>0</span><span>+</span></div>
        {note && <small>{note}</small>}
        {!terms.length && <span className="channel-state-empty">{lang === "zh" ? "S 为空" : "S is empty"}</span>}
      </div>;
  }, []);

  const StateOperation = useMemo(() => ({ label, detail }) => {
    return <div className="channel-state-operation" aria-label={label}>
        <span>→</span>
        <b>{label}</b>
        {detail && <small>{detail}</small>}
      </div>;
  }, []);

  const ContributionLegend = useMemo(() => ({ lang, third }) => {
    return <div className="channel-contribution-legend">
        <span><i style={{ background: seriesColor(1) }} />{lang === "zh" ? "A 的旧贡献" : "old A contribution"}</span>
        <span><i style={{ background: seriesColor(2) }} />{lang === "zh" ? "B 的贡献" : "B contribution"}</span>
        {third && <span><i style={{ background: seriesColor(4) }} />{third === "delta" ? lang === "zh" ? "本步沿 kₐ 的残差更新" : "this step's residual update along kₐ" : lang === "zh" ? "A=4 的新贡献" : "new contribution from A=4"}</span>}
        <small>{lang === "zh" ? "颜色仅追踪贡献来源；真实 S 只保存每个格子的总和" : "Colors only trace provenance; the real S stores only the summed values"}</small>
      </div>;
  }, []);

  const MATH_TOKENS = [
    { text: "A=1", kind: "write", color: 1, key: "A", value: 1 },
    { text: "B=2", kind: "write", color: 2, key: "B", value: 2 },
    { text: "A=4", kind: "write", color: 4, key: "A", value: 4 },
    { text: "A?", kind: "query", color: 0, key: "A" }
  ];

  const CELL = 30;

  const PITCH = 47;

  const TOKEN_X = 18;

  const TOKEN_Y = 28;

  const BOX_Y = 115;

  const LEFT_BOX = 18;

  const RIGHT_BOX = 450;

  const BOX_W = 150;

  const BOX_H = 48;

  const STRIPE_W = 13;

  const WIDTH = 620;

  const HEIGHT = 205;

  const mathStateAfter = (completed, lang) => {
    const terms = [];
    if (completed >= 1) terms.push({ id: "a-old", label: lang === "zh" ? "A旧" : "A old", vector: KEY_A, scalar: 1, color: 1 });
    if (completed >= 2) terms.push({ id: "b", label: "B", vector: KEY_B, scalar: 2, color: 2 });
    if (completed >= 3) terms.push({ id: "a-new", label: lang === "zh" ? "A新" : "A new", vector: KEY_A, scalar: 4, color: 4 });
    return terms;
  }

  const drawState = (indices, tokens, x, y, current, onHover) => {
    return <g onMouseEnter={onHover}>
      <rect x={x} y={y} width={BOX_W} height={BOX_H} rx={8} fill="none" stroke="var(--ink)" strokeOpacity={0.4} strokeWidth={1.3} />
      {indices.map((tokenIndex, slot) => <rect key={tokenIndex} x={x + 4 + slot * (STRIPE_W + 2)} y={y + 4} width={STRIPE_W} height={BOX_H - 8} rx={2} fill={seriesColor(tokens[tokenIndex].color)} opacity={0.82} stroke={tokenIndex === current ? "var(--accent)" : "none"} strokeWidth={tokenIndex === current ? 1.5 : 0} />)}
    </g>;
  }
  const [mode, setMode] = useState("math");
  const tokens = mode === "sentence" ? MHA_TOKENS[lang].map((token, i) => ({ text: token.text, kind: "write-read", color: i + 1 })) : MATH_TOKENS;
  const player = useSimPlayer(tokens.length, 1.2);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const t = Math.min(player.t, tokens.length);
  const cur = t - 1;
  const beforeIndices = tokens.slice(0, Math.max(0, cur)).map((_, i) => i).filter((i) => tokens[i].kind !== "query");
  const afterIndices = tokens.slice(0, t).map((_, i) => i).filter((i) => tokens[i].kind !== "query");
  const currentIsQuery = cur >= 0 && tokens[cur].kind === "query";
  const mathBefore = mathStateAfter(Math.min(3, Math.max(0, t - 1)), lang);
  const mathAfter = currentIsQuery ? mathBefore : mathStateAfter(Math.min(3, t), lang);
  const mathReadA = stateRead(mathAfter, KEY_A);
  const mathTimeline = MATH_TOKENS.map((token) => ({
    label: token.text === "A?" ? "qₐ?" : token.text,
    kind: token.kind === "query" ? "query" : "write",
    color: token.color
  }));
  const switchMode = (next) => {
    setMode(next);
    player.reset();
    setHover(null);
  };
  const showTooltip = (e, message) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: message });
  };
  return <VizStage
    title={LINFLOW.title[lang]}
    player={player}
    lang={lang}
    headExtra={<span className="viz-presets" role="group" aria-label={lang === "zh" ? "示例类型" : "example type"}>
          <button type="button" className={`viz-btn${mode === "sentence" ? " primary" : ""}`} onClick={() => switchMode("sentence")}>{lang === "zh" ? "句子例子" : "Sentence"}</button>
          <button type="button" className={`viz-btn${mode === "math" ? " primary" : ""}`} onClick={() => switchMode("math")}>{lang === "zh" ? "数学解释" : "Math"}</button>
        </span>}
    footer={mode === "sentence" ? <Legend items={[
      { label: lang === "zh" ? "颜色 = 同一个 token 及其状态贡献" : "color = the same token and its state contribution", swatch: { background: "linear-gradient(90deg, var(--series-1) 0 50%, var(--series-2) 50%)" } },
      { label: LINFLOW.legendWrite[lang], swatch: { background: "color-mix(in srgb, var(--accent) 60%, transparent)" } },
      { label: LINFLOW.legendRead[lang], swatch: { background: "repeating-linear-gradient(90deg, var(--accent) 0 3px, transparent 3px 6px)" } }
    ]} /> : void 0}
  >
      {mode === "math" ? <div className="viz-section">
        <div className="viz-section-head">
          <span className="viz-section-stats">{lang === "zh" ? "二维教学切片：真实每个 head 的 S 为 128×128" : "2D teaching slice: the real S is 128×128 per head"}</span>
          {t >= 1 && <span className="k3a-chip">t={t} {mhaChip(lang, tokens[cur].text)}</span>}
        </div>
        <TokenTimeline items={mathTimeline} t={t} />
        <div className="key-channel-workbench">
          <KeySpacePanel lang={lang} />
          <ChannelStatePanel title={lang === "zh" ? "本步进入的 S" : "S entering this step"} terms={mathBefore} lang={lang} />
          <StateOperation
    label={currentIsQuery ? lang === "zh" ? `qₐ 读出 ${Number(mathReadA.toFixed(2))}` : `qₐ reads ${Number(mathReadA.toFixed(2))}` : lang === "zh" ? "直接累加 kvᵀ" : "directly add kvᵀ"}
    detail={currentIsQuery ? "o=Sᵀqₐ" : "S←S+kvᵀ"}
  />
          <ChannelStatePanel title={lang === "zh" ? "本步结束后的 S" : "S after this step"} terms={mathAfter} lang={lang} accent={t > 0} />
        </div>
        <ContributionLegend lang={lang} third="new" />
      </div> : <div className="viz-section">
        <div className="viz-section-head">
          <span className="viz-section-stats">{mode === "sentence" ? <>{LINFLOW.statState[lang]} · {LINFLOW.statStep[lang]} · {LINFLOW.statCum[lang]} {t} · {LINFLOW.statMha[lang]} {t} {LINFLOW.statMhaCum[lang]} {t * (t - 1) / 2}</> : <>{lang === "zh" ? `状态大小 常数 · 已写入 ${afterIndices.length} 条关联` : `state size constant · ${afterIndices.length} associations written`}</>}</span>
          {t >= 1 && <span className="k3a-chip">t={t} {mhaChip(lang, tokens[cur].text)}</span>}
        </div>
        <div className="viz-grid-wrap" ref={wrapRef}>
          <svg className="viz-grid" style={{ minWidth: 500, maxWidth: 680 }} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LINFLOW.title[lang]} onMouseLeave={() => setHover(null)}>
            <defs><marker id="linear-flow-arrow" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" /></marker></defs>
            {tokens.map((tok, i) => {
    const x = TOKEN_X + i * PITCH;
    const seen = i < t;
    const current = i === cur;
    return <g key={i}>
                <rect className="viz-cell" x={x} y={TOKEN_Y} width={CELL} height={CELL} rx={5} fill={seen ? tok.kind === "query" ? "var(--axis)" : seriesColor(tok.color) : "none"} opacity={seen ? tok.kind === "query" ? 0.5 : 0.86 : 1} stroke={current ? "var(--accent)" : "var(--grid)"} strokeWidth={current ? 2 : 1} onMouseEnter={seen ? (e) => showTooltip(e, mhaCellTooltip(lang, i + 1, tok.text, null)) : void 0} />
                {seen && <text x={x + CELL / 2} y={TOKEN_Y + 43} textAnchor="middle" fontSize="9" fill={current ? "var(--accent)" : "var(--muted)"} fontWeight={current ? 700 : 400}>{tok.text}</text>}
              </g>;
  })}

            {t >= 1 && <>
              <path d={`M ${LEFT_BOX + BOX_W + 7} ${BOX_Y + BOX_H / 2} L 218 ${BOX_Y + BOX_H / 2}`} fill="none" stroke="var(--accent)" strokeWidth="2.2" opacity="0.7" />
              <path d={`M 422 ${BOX_Y + BOX_H / 2} L ${RIGHT_BOX - 10} ${BOX_Y + BOX_H / 2}`} fill="none" stroke="var(--accent)" strokeWidth="2.2" opacity="0.7" markerEnd="url(#linear-flow-arrow)" />
            </>}
            <text x={LEFT_BOX + BOX_W / 2} y={BOX_Y - 12} textAnchor="middle" fontSize="10" fill="var(--muted)" fontWeight="650">{lang === "zh" ? "写入前的 S" : "S before this step"}</text>
            {drawState(beforeIndices, tokens, LEFT_BOX, BOX_Y, -1, (e) => showTooltip(e, linflowBoxTooltip(lang, beforeIndices.length)))}
            <text x={RIGHT_BOX + BOX_W / 2} y={BOX_Y - 12} textAnchor="middle" fontSize="10" fill="var(--muted)" fontWeight="650">{currentIsQuery ? lang === "zh" ? "读取后的 S（没有改写）" : "S after read (unchanged)" : lang === "zh" ? "写入后的 S（大小不变）" : "S after write (same size)"}</text>
            {drawState(afterIndices, tokens, RIGHT_BOX, BOX_Y, currentIsQuery ? -1 : cur, (e) => showTooltip(e, linflowBoxTooltip(lang, afterIndices.length)))}
            {t >= 1 && <g transform="translate(225 120)">
              <>
                <text x="0" y="0" fontSize="10" fill="var(--ink-2)">{lang === "zh" ? "写入" : "write"}: <tspan fill="var(--ink)" fontWeight="700">Sₜ = Sₜ₋₁ + kₜvₜᵀ</tspan></text>
                <text x="0" y="22" fontSize="10" fill="var(--accent)" fontWeight="700">{lang === "zh" ? "固定状态原地更新" : "fixed state updated in place"}</text>
                <text x="0" y="44" fontSize="10" fill="var(--ink-2)">{lang === "zh" ? "读出" : "read"}: <tspan fill="var(--ink)" fontWeight="700">oₜ = Sₜᵀqₜ</tspan></text>
              </>
            </g>}
          </svg>
          {hover && <div className="viz-tooltip" style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -130%)" }}>{hover.text}</div>}
        </div>
      </div>}
    </VizStage>;
}
