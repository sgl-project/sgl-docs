// CacheViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const CacheViz = ({ lang = "zh" }) => {
  const CACHE = {
    title: {
      zh: "KV cache 对比图",
      en: "KV cache comparison"
    },
    hypoLabel: { zh: "假想：93 层全 MLA", en: "Hypothetical: all 93 layers MLA" },
    k3Label: { zh: "K3：24 层 MLA + 69 层 KDA", en: "K3: 24 MLA + 69 KDA layers" },
    stripCaption: {
      zh: "3 层 KDA + 1 层 MLA 交错，×23 组，末尾再加 1 层 MLA，共 93 层",
      en: "3 KDA + 1 MLA interleaved, ×23 blocks, plus one final MLA layer: 93 total"
    },
    legendMla: {
      zh: "MLA KV cache（随上下文逐格增长）",
      en: "MLA KV cache (grows cell by cell with context)"
    },
    legendKda: {
      zh: "KDA 递归状态（TP=8 下每 GPU 固定约 54 MB）",
      en: "KDA recurrent state (≈54 MB per GPU at TP=8, independent of context)"
    },
    statContext: { zh: "上下文", en: "context" },
    statCache: { zh: "cache", en: "cache" },
    statPerToken: { zh: "每 token", en: "per token" },
    kLayerTip: {
      zh: "KDA 层：线性注意力，状态固定大小，每步原地覆写",
      en: "KDA layer: linear attention, fixed-size state overwritten in place"
    },
    mLayerTip: {
      zh: "MLA 层：全局 attention（NoPE），KV 随上下文增长",
      en: "MLA layer: global attention (NoPE), KV grows with context"
    }
  };

  const cacheCellTooltip = (locale, kind, layers) => {
    const zh = locale === "zh";
    if (kind === "kda") {
      return zh ? "KDA 递归状态：TP=8 下每 GPU 约 54 MB，固定不涨" : "KDA recurrent state: ≈54 MB per GPU at TP=8, never grows";
    }
    return zh ? `≈2 GB 的 MLA KV(${layers} 层合计，每 token 约 ${layers === 24 ? "27" : "105"} KB)` : `≈2 GB of MLA KV (${layers} layers, ≈${layers === 24 ? "27" : "105"} KB per token)`;
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

  const STEPS = 16;

  const STEP_TOKENS = 65536;

  const KB_PER_LAYER_TOKEN = 27 / 24;

  const K3_MLA_LAYERS = 24;

  const HYPO_LAYERS = 93;

  const KDA_FIXED_GB = 0.054;

  const GB_PER_CELL = 2;

  const CELL = 9;

  const GAP = 2;

  const PITCH = CELL + GAP;

  const AXIS_H = 16;

  const mlaGb = (t, layers) => {
    return t * STEP_TOKENS * KB_PER_LAYER_TOKEN * layers / 1e6;
  }

  const fmtTokens = (t) => {
    return t >= STEPS ? "1M" : `${t * 64}K`;
  }

  const STRIP_PATTERN = ["K", "K", "K", "M", "K", "K", "K", "M"];

  const CacheBar = useMemo(() => ({
    label,
    layers,
    withKda,
    t,
    lang,
    maxCells
  }) => {
    const wrapRef = useRef(null);
    const [hover, setHover] = useState(null);
    const gb = mlaGb(t, layers);
    const cells = Math.round(gb / GB_PER_CELL);
    const kdaOffset = withKda ? PITCH : 0;
    const width = kdaOffset + maxCells * PITCH + 2;
    const height = CELL + AXIS_H + 2;
    const totalGb = gb + (withKda ? KDA_FIXED_GB : 0);
    const showTooltip = (e, text) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      setHover({
        x: e.clientX - rect.left + wrap.scrollLeft,
        y: e.clientY - rect.top,
        text
      });
    };
    return <div className="viz-section">
        <div className="viz-section-head">
          <b>{label}</b>
          <span className="viz-section-stats">
            {CACHE.statContext[lang]} {fmtTokens(t)} token · {CACHE.statCache[lang]}{" "}
            {totalGb < 10 ? totalGb.toFixed(1) : Math.round(totalGb)} GB ·{" "}
            {CACHE.statPerToken[lang]} {Math.round(KB_PER_LAYER_TOKEN * layers)} KB
          </span>
        </div>
        <div className="viz-grid-wrap" ref={wrapRef}>
          <svg
      className="viz-grid"
      style={{ minWidth: 620 }}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      onMouseLeave={() => setHover(null)}
    >
            {withKda && <rect
      x={0}
      y={1}
      width={CELL}
      height={CELL}
      rx={2.5}
      fill="var(--series-1)"
      stroke="var(--ink)"
      strokeOpacity={0.35}
      strokeWidth="1"
      onMouseEnter={(e) => showTooltip(e, cacheCellTooltip(lang, "kda", layers))}
    />}
            {Array.from({ length: maxCells }, (_, i) => {
      const x = kdaOffset + i * PITCH;
      const filled = i < cells;
      if (!filled) {
        return <rect
          key={i}
          x={x}
          y={1}
          width={CELL}
          height={CELL}
          rx={2.5}
          fill="none"
          stroke="var(--grid)"
          strokeWidth="1"
        />;
      }
      return <rect
        key={i}
        className="viz-cell"
        x={x}
        y={1}
        width={CELL}
        height={CELL}
        rx={2.5}
        fill="var(--series-1)"
        opacity={0.45}
        onMouseEnter={(e) => showTooltip(e, cacheCellTooltip(lang, "mla", layers))}
      />;
    })}
            {
      /* GB 刻度：每 10 格 = 20 GB */
    }
            {Array.from({ length: Math.floor(maxCells / 10) + 1 }, (_, i) => <text
      key={i}
      x={kdaOffset + i * 10 * PITCH - GAP / 2}
      y={CELL + AXIS_H - 3}
      textAnchor="middle"
      fontSize="8"
      fill="var(--muted)"
    >
                {i * 10 * GB_PER_CELL}
              </text>)}
            <text
      x={width - 2}
      y={CELL + AXIS_H - 3}
      textAnchor="end"
      fontSize="8"
      fill="var(--muted)"
    >
              GB
            </text>
          </svg>
          {hover && <div
      className="viz-tooltip"
      style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -130%)" }}
    >
              {hover.text}
            </div>}
        </div>
      </div>;
  }, []);
  const player = useSimPlayer(STEPS, 2);
  const maxCells = Math.round(mlaGb(STEPS, HYPO_LAYERS) / GB_PER_CELL);
  const legend = [
    { label: CACHE.legendMla[lang], swatch: { background: "var(--series-1)", opacity: 0.45 } },
    {
      label: CACHE.legendKda[lang],
      swatch: {
        background: "var(--series-1)",
        border: "1px solid color-mix(in srgb, var(--ink) 35%, transparent)"
      }
    }
  ];
  return <VizStage
    title={CACHE.title[lang]}
    player={player}
    lang={lang}
    footer={<Legend items={legend} />}
  >
      {
    /* 3:1 交错排布示意 */
  }
      <div className="k3a-strip">
        {STRIP_PATTERN.map((kind, i) => <span
    key={i}
    className={`k3a-layer ${kind === "K" ? "k3a-layer-k" : "k3a-layer-m"}`}
    title={CACHE[kind === "K" ? "kLayerTip" : "mLayerTip"][lang]}
  >
            {kind}
          </span>)}
        <span className="k3a-strip-caption">{CACHE.stripCaption[lang]}</span>
      </div>

      <CacheBar
    label={CACHE.hypoLabel[lang]}
    layers={HYPO_LAYERS}
    withKda={false}
    t={player.t}
    lang={lang}
    maxCells={maxCells}
  />
      <CacheBar
    label={CACHE.k3Label[lang]}
    layers={K3_MLA_LAYERS}
    withKda
    t={player.t}
    lang={lang}
    maxCells={maxCells}
  />
    </VizStage>;
}
