// MhaViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const MhaViz = ({ lang = "zh" }) => {
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

  const MATH_TOKENS = [
    { text: "A=1", kind: "write", color: 1, value: 1 },
    { text: "B=2", kind: "write", color: 2, value: 2, focus: [[0, 0.2]] },
    { text: "A=4", kind: "write", color: 4, value: 4, focus: [[0, 0.45]] },
    { text: "A?", kind: "query", color: 0, scores: [[0, 0], [1, 0], [2, 2.89]] }
  ];

  const CELL = 30;

  const PITCH = 47;

  const TOKEN_X = 18;

  const TOKEN_Y = 28;

  const CACHE_X = 18;

  const CACHE_Y = 118;

  const CACHE_W = 390;

  const CACHE_H = 48;

  const CACHE_CELL = 36;

  const QUERY_X = 500;

  const QUERY_SIZE = 34;

  const WIDTH = 620;

  const HEIGHT = 205;

  const weightsFor = (tokens, c) => {
    const scores = tokens[c].scores;
    if (scores) {
      const scoreMap = new Map(scores);
      const logits = Array.from({ length: c }, (_, i) => scoreMap.get(i) ?? Number.NEGATIVE_INFINITY);
      const maxLogit = Math.max(...logits);
      const exps = logits.map((score) => Math.exp(score - maxLogit));
      const denominator = exps.reduce((sum, value) => sum + value, 0);
      return exps.map((value) => value / denominator);
    }
    const focus = tokens[c].focus ?? [];
    const focusMap = new Map(focus);
    const focusSum = focus.reduce((a, [, w]) => a + w, 0);
    const rest = Array.from({ length: c }, (_, i) => i).filter((i) => !focusMap.has(i));
    const raw = rest.map((i) => 0.55 ** (c - 1 - i));
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1;
    const out = Array(c).fill(0);
    for (const [i, w] of focus) out[i] = w;
    rest.forEach((i, j) => {
      out[i] = (1 - focusSum) * raw[j] / rawSum;
    });
    return out;
  }
  const [mode, setMode] = useState("sentence");
  const tokens = mode === "sentence" ? MHA_TOKENS[lang].map((token, i) => ({ ...token, kind: "write", color: i + 1 })) : MATH_TOKENS;
  const player = useSimPlayer(tokens.length, 1.2);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const t = Math.min(player.t, tokens.length);
  const cur = t - 1;
  const weights = t >= 2 ? weightsFor(tokens, cur) : [];
  const cacheEntries = tokens.slice(0, t).map((token, index) => ({ token, index })).filter(({ token }) => token.kind !== "query");
  const scoreVector = cur >= 0 && tokens[cur].scores ? Array.from({ length: cur }, (_, i) => new Map(tokens[cur].scores).get(i) ?? Number.NEGATIVE_INFINITY) : null;
  const mathQuery = mode === "math" && cur >= 0 && tokens[cur].kind === "query";
  const weightedOutput = mathQuery ? weights.reduce((sum, weight, i) => sum + weight * (tokens[i].value ?? 0), 0) : null;
  const dot = Math.max(0, t - 1);
  const cumDot = t * (t - 1) / 2;
  const switchMode = (next) => {
    setMode(next);
    player.reset();
    setHover(null);
  };
  const tokenFill = (token, index) => token.kind === "query" ? "var(--axis)" : seriesColor(token.color ?? index + 1);
  const showTooltip = (e, message) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: message });
  };
  return <VizStage
    title={MHA.title[lang]}
    player={player}
    lang={lang}
    headExtra={<span className="viz-presets" role="group" aria-label={lang === "zh" ? "示例类型" : "example type"}>
          <button type="button" className={`viz-btn${mode === "sentence" ? " primary" : ""}`} onClick={() => switchMode("sentence")}>{lang === "zh" ? "句子例子" : "Sentence"}</button>
          <button type="button" className={`viz-btn${mode === "math" ? " primary" : ""}`} onClick={() => switchMode("math")}>{lang === "zh" ? "数学解释" : "Math"}</button>
        </span>}
    footer={<Legend items={[
      { label: lang === "zh" ? "颜色 = 同一个 token 及其 KV" : "color = the same token and its KV", swatch: { background: "linear-gradient(90deg, var(--series-1) 0 50%, var(--series-2) 50%)" } },
      { label: MHA.legendLine[lang], swatch: { background: "color-mix(in srgb, var(--accent) 55%, transparent)" } },
      { label: MHA.legendCurrent[lang], swatch: { background: "transparent", border: "2px solid var(--accent)" } }
    ]} />}
  >
      <div className="viz-section">
        <div className="viz-section-head">
          <span className="viz-section-stats">{MHA.statCache[lang]} {cacheEntries.length} {MHA.cells[lang]} · {MHA.statDot[lang]} {dot} {MHA.times[lang]} · {MHA.statTotal[lang]} {cumDot} {MHA.times[lang]}</span>
          {t >= 1 && <span className="k3a-chip">t={t} {mhaChip(lang, tokens[cur].text)}</span>}
        </div>
        <div className="viz-grid-wrap" ref={wrapRef}>
          <svg className="viz-grid" style={{ minWidth: 500, maxWidth: 680 }} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={MHA.title[lang]} onMouseLeave={() => setHover(null)}>
            {tokens.map((tok, i) => {
    const x = TOKEN_X + i * PITCH;
    const seen = i < t;
    const current = i === cur;
    return <g key={i}>
                <rect className="viz-cell" x={x} y={TOKEN_Y} width={CELL} height={CELL} rx={5} fill={seen ? tokenFill(tok, i) : "none"} opacity={seen ? tok.kind === "query" ? 0.5 : 0.86 : 1} stroke={current ? "var(--accent)" : "var(--grid)"} strokeWidth={current ? 2 : 1} onMouseEnter={seen ? (e) => showTooltip(e, mhaCellTooltip(lang, i + 1, tok.text, i < weights.length ? weights[i] : null)) : void 0} />
                {seen && <text x={x + CELL / 2} y={TOKEN_Y + 43} textAnchor="middle" fontSize="9" fill={current ? "var(--accent)" : "var(--muted)"} fontWeight={current ? 700 : 400}>{tok.text}</text>}
              </g>;
  })}

            <text x={CACHE_X + CACHE_W / 2} y={CACHE_Y - 24} textAnchor="middle" fontSize="10" fill="var(--muted)" fontWeight="650">{lang === "zh" ? "KV cache（本步结束后）" : "KV cache (after this step)"}</text>
            <rect x={CACHE_X} y={CACHE_Y} width={CACHE_W} height={CACHE_H} rx={8} fill="none" stroke="var(--ink)" strokeOpacity={0.4} strokeWidth={1.3} />
            {cacheEntries.map(({ token: tok, index: originalIndex }, i) => {
    const x = CACHE_X + 4 + i * (CACHE_CELL + 3);
    return <g key={`cache-${originalIndex}`} onMouseEnter={(e) => showTooltip(e, mhaCellTooltip(lang, originalIndex + 1, tok.text, originalIndex < weights.length ? weights[originalIndex] : null))}>
                <rect x={x} y={CACHE_Y + 4} width={CACHE_CELL} height={CACHE_H - 8} rx={3} fill={tokenFill(tok, originalIndex)} opacity={originalIndex === cur ? 0.35 : 0.8} stroke={originalIndex === cur ? "var(--accent)" : "none"} strokeDasharray={originalIndex === cur ? "3 2" : void 0} />
                <text x={x + CACHE_CELL / 2} y={CACHE_Y + CACHE_H + 13} textAnchor="middle" fontSize="8" fill="var(--muted)">{tok.text}</text>
              </g>;
  })}

            {t >= 1 && <g>
              <rect x={QUERY_X} y={CACHE_Y + 7} width={QUERY_SIZE} height={QUERY_SIZE} rx={6} fill="var(--axis)" opacity={0.5} stroke="var(--accent)" strokeWidth="1.8" />
              <text x={QUERY_X + QUERY_SIZE / 2} y={CACHE_Y + 28} textAnchor="middle" fontSize="11" fill="var(--accent-ink)" fontWeight="750">q</text>
              <text x={QUERY_X + QUERY_SIZE / 2} y={CACHE_Y + CACHE_H + 13} textAnchor="middle" fontSize="8.5" fill="var(--muted)">{tokens[cur].text}</text>
            </g>}

            {weights.map((weight, i) => {
    const sx = QUERY_X;
    const laneGap = weights.length > 1 ? 22 / (weights.length - 1) : 0;
    const sy = CACHE_Y + 13 + i * laneGap;
    const ex = CACHE_X + 4 + i * (CACHE_CELL + 3) + CACHE_CELL;
    const ey = CACHE_Y + 10 + i * laneGap;
    const bendY = CACHE_Y - 18 + i * 10;
    const labelX = CACHE_X + 4 + i * (CACHE_CELL + 3) + CACHE_CELL / 2;
    return <g key={`attn-${i}`}>
                <path d={`M ${sx} ${sy} C ${sx - 70} ${sy}, ${ex + 110} ${bendY}, ${ex} ${ey}`} fill="none" stroke="var(--accent)" strokeWidth={Math.max(1.2, weight * 12)} strokeLinecap="round" opacity={0.38 + weight * 0.5} />
                <circle cx={ex} cy={ey} r="2" fill="var(--accent)" opacity={0.55 + weight * 0.4} />
                <text x={labelX} y={CACHE_Y - 6} textAnchor="middle" fontSize="8" fill="var(--ink-2)" fontWeight="650">{weight.toFixed(2)}</text>
              </g>;
  })}
          </svg>
          {hover && <div className="viz-tooltip" style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -130%)" }}>{hover.text}</div>}
        </div>
        {t >= 2 && <div className="mha-formula-chain" aria-label={lang === "zh" ? "MHA softmax 计算步骤" : "MHA softmax calculation steps"}>
          <span><b>{lang === "zh" ? "① 点积打分" : "① dot-product scores"}</b><code>zᵢ = qᵀkᵢ / √d{scoreVector ? ` = [${scoreVector.map((score) => score.toFixed(2)).join(", ")}]` : ""}</code></span>
          <span className="mha-formula-arrow">→</span>
          <span><b>{lang === "zh" ? "② softmax 归一化" : "② softmax normalization"}</b><code>aᵢ = softmax(z)ᵢ{mathQuery ? ` = [${weights.map((weight) => weight.toFixed(2)).join(", ")}]` : ""}</code></span>
          <span className="mha-formula-arrow">→</span>
          <span><b>{lang === "zh" ? "③ value 加权求和" : "③ weighted value sum"}</b><code>o = Σᵢ aᵢvᵢ{weightedOutput === null ? "" : ` = ${weightedOutput.toFixed(2)}`}</code></span>
        </div>}
      </div>
    </VizStage>;
}
