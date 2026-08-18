// PoolViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const PoolViz = ({ lang = "zh" }) => {
  const POOL = {
    title: {
      zh: "显存池对比图",
      en: "Memory pool comparison"
    },
    subtitle: {
      zh: "请求准入时同时分配两类状态；之后 KDA 固定，MLA 随 token 增长",
      en: "Both states allocate on admission; KDA then stays fixed while MLA grows with tokens"
    },
    splitLabel: { zh: "静态双池（启动时切死）", en: "Static split pools (fixed at startup)" },
    unifiedLabel: { zh: "统一池（SGLang）", en: "Unified pool (SGLang)" },
    kdaRegion: { zh: "KDA 区", en: "KDA region" },
    mlaRegion: { zh: "MLA 区", en: "MLA region" },
    kdaFrom: { zh: "KDA →", en: "KDA →" },
    mlaFrom: { zh: "← MLA", en: "← MLA" },
    legendKda: {
      zh: "KDA 递归状态（固定大小，原地覆写）",
      en: "KDA recurrent state (fixed size, overwritten in place)"
    },
    legendMla: {
      zh: "MLA KV cache（随生成逐页追加）",
      en: "MLA KV cache (appends page by page)"
    },
    legendFree: { zh: "空闲页", en: "free page" },
    statActive: { zh: "在跑", en: "running" },
    activeRequests: { zh: "当前请求", en: "active requests" },
    requests: { zh: "请求", en: "requests" },
    mlaGrowth: { zh: "随 token 逐页累积", en: "accumulates page by page with tokens" },
    remainingCapacity: { zh: "未使用容量", en: "unused capacity" },
    statFree: { zh: "空闲", en: "free" },
    statFailures: { zh: "失败", en: "failures" },
    pages: { zh: "页", en: "pages" }
  };

  const poolEventText = (locale, t, req, type) => {
    if (locale === "zh") {
      return type === "evict" ? `t=${t} ✗ R${req} 生成中被驱逐(MLA 长不动)` : `t=${t} ✗ R${req} 被拒绝(放不下)`;
    }
    return type === "evict" ? `t=${t} ✗ R${req} evicted mid-generation (MLA can't grow)` : `t=${t} ✗ R${req} rejected (no room)`;
  }

  const poolCellTooltip = (locale, page, cell) => {
    const zh = locale === "zh";
    if (!cell) return zh ? `第 ${page} 页 · 空闲` : `page ${page} · free`;
    if (cell.kind === "kda") {
      return zh ? `R${cell.owner} · KDA 递归状态(固定大小，每步原地覆写)` : `R${cell.owner} · KDA recurrent state (fixed size, overwritten each step)`;
    }
    return zh ? `R${cell.owner} · MLA KV cache(随 token 逐页追加)` : `R${cell.owner} · MLA KV cache (appended page by page with tokens)`;
  }

  const MAX_ITERS = 200;

  const findRun = (pages, lo, hi, len) => {
    let run = 0;
    for (let i = lo; i < hi; i++) {
      run = pages[i] === null ? run + 1 : 0;
      if (run === len) return i - len + 1;
    }
    return -1;
  }

  const findFromRight = (pages, lo, hi) => {
    for (let i = hi - 1; i >= lo; i--) {
      if (pages[i] === null) return i;
    }
    return -1;
  }

  const shuffledIndices = (lo, hi, seed) => {
    const indices = Array.from({ length: hi - lo }, (_, i) => lo + i);
    let state = seed >>> 0;
    for (let i = indices.length - 1; i > 0; i--) {
      state = Math.imul(state, 1664525) + 1013904223 >>> 0;
      const j = state % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  const simulatePool = (mode, poolSize, splitAt, requests) => {
    const pages = Array(poolSize).fill(null);
    const active = /* @__PURE__ */ new Map();
    const events = [];
    const frames = [pages.slice()];
    const metrics = [
      { kdaPages: 0, mlaPages: 0, freePages: poolSize, failures: 0, active: 0, completed: 0 }
    ];
    const sorted = [...requests].sort((a, b) => a.start - b.start || a.id - b.id);
    let completed = 0;
    let failures = 0;
    let peakUsed = 0;
    const kdaLo = 0;
    const kdaHi = mode === "split" ? splitAt : poolSize;
    const mlaLo = mode === "split" ? splitAt : 0;
    const mlaHi = poolSize;
    const splitKdaOrder = shuffledIndices(kdaLo, kdaHi, 4932673);
    const splitMlaOrder = shuffledIndices(mlaLo, mlaHi, 5065793);
    const randomFree = (order) => order.find((i) => pages[i] === null) ?? -1;
    const allocKda = (req, a) => {
      if (mode === "split") {
        for (let n = 0; n < req.kdaPages; n++) {
          const at2 = randomFree(splitKdaOrder);
          if (at2 < 0) return false;
          pages[at2] = { owner: req.id, kind: "kda" };
          a.pages.push(at2);
        }
        return true;
      }
      const at = findRun(pages, kdaLo, kdaHi, req.kdaPages);
      if (at < 0) return false;
      for (let i = at; i < at + req.kdaPages; i++) {
        pages[i] = { owner: req.id, kind: "kda" };
        a.pages.push(i);
      }
      return true;
    };
    const allocMla = (req, a) => {
      const at = mode === "split" ? randomFree(splitMlaOrder) : findFromRight(pages, mlaLo, mlaHi);
      if (at < 0) return false;
      pages[at] = { owner: req.id, kind: "mla" };
      a.pages.push(at);
      return true;
    };
    const free = (a) => {
      for (const i of a.pages) pages[i] = null;
    };
    const lastEnd = Math.max(...sorted.map((r) => r.start + r.tokens));
    const total = Math.min(lastEnd + 1, MAX_ITERS);
    for (let t = 0; t < total; t++) {
      for (const [id, a] of [...active]) {
        if (t >= a.spec.start + a.spec.tokens) {
          free(a);
          active.delete(id);
          completed++;
        }
      }
      for (const req of sorted) {
        if (req.start !== t) continue;
        const a = { spec: req, pages: [] };
        if (allocKda(req, a) && allocMla(req, a)) {
          active.set(req.id, a);
        } else {
          free(a);
          events.push({ t, req: req.id, type: "reject" });
          failures++;
        }
      }
      for (const [id, a] of [...active]) {
        const { start, growEvery } = a.spec;
        if (t > start && (t - start) % growEvery === 0) {
          if (!allocMla(a.spec, a)) {
            free(a);
            active.delete(id);
            events.push({ t, req: id, type: "evict" });
            failures++;
          }
        }
      }
      frames.push(pages.slice());
      const kdaPages = pages.filter((p) => p?.kind === "kda").length;
      const mlaPages = pages.filter((p) => p?.kind === "mla").length;
      peakUsed = Math.max(peakUsed, kdaPages + mlaPages);
      metrics.push({
        kdaPages,
        mlaPages,
        freePages: poolSize - kdaPages - mlaPages,
        failures,
        active: active.size,
        completed
      });
    }
    return {
      mode,
      poolSize,
      splitAt: mode === "split" ? splitAt : -1,
      totalIterations: total,
      frames,
      metrics,
      events,
      peakUsed
    };
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

  const POOL_SIZE = 44;

  const SPLIT_AT = 22;

  const KDA_PAGES_PER_REQUEST = 3;

  const TRACE = [
    { id: 1, start: 0, tokens: 18, kdaPages: KDA_PAGES_PER_REQUEST, growEvery: 2 },
    { id: 2, start: 3, tokens: 18, kdaPages: KDA_PAGES_PER_REQUEST, growEvery: 2 },
    { id: 3, start: 6, tokens: 16, kdaPages: KDA_PAGES_PER_REQUEST, growEvery: 2 },
    { id: 4, start: 9, tokens: 14, kdaPages: KDA_PAGES_PER_REQUEST, growEvery: 2 },
    { id: 5, start: 25, tokens: 6, kdaPages: KDA_PAGES_PER_REQUEST, growEvery: 2 }
  ];

  const CELL = 12;

  const GAP = 2;

  const PITCH = CELL + GAP;

  const LABEL_H = 16;

  const PoolBar = useMemo(() => ({
    result,
    t,
    lang
  }) => {
    const wrapRef = useRef(null);
    const [hover, setHover] = useState(null);
    const frame = result.frames[Math.min(t, result.totalIterations)];
    const width = result.poolSize * PITCH + 2;
    const height = LABEL_H + CELL + 4;
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
    return <div className="viz-grid-wrap" ref={wrapRef}>
        <svg
      className="viz-grid"
      style={{ minWidth: 420 }}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={POOL[result.mode === "split" ? "splitLabel" : "unifiedLabel"][lang]}
      onMouseLeave={() => setHover(null)}
    >
          {
      /* 分区/方向标注 */
    }
          {result.mode === "split" ? <>
              <text x={0} y={11} fontSize="10" fill="var(--muted)">
                {POOL.kdaRegion[lang]}
              </text>
              <text x={result.splitAt * PITCH + 4} y={11} fontSize="10" fill="var(--muted)">
                {POOL.mlaRegion[lang]}
              </text>
              <line
      x1={result.splitAt * PITCH - GAP / 2}
      y1={2}
      x2={result.splitAt * PITCH - GAP / 2}
      y2={height}
      stroke="var(--ink)"
      strokeWidth="1.5"
      strokeDasharray="3 2"
    />
            </> : <>
              <text x={0} y={11} fontSize="10" fill="var(--muted)">
                {POOL.kdaFrom[lang]}
              </text>
              <text x={width - 2} y={11} fontSize="10" fill="var(--muted)" textAnchor="end">
                {POOL.mlaFrom[lang]}
              </text>
            </>}
          {frame.map((cell, i) => {
      const x = i * PITCH;
      const common = {
        x,
        y: LABEL_H,
        width: CELL,
        height: CELL,
        rx: 2.5,
        onMouseEnter: (e) => showTooltip(e, poolCellTooltip(lang, i, cell))
      };
      if (!cell) {
        return <rect
          key={i}
          {...common}
          fill="none"
          stroke="var(--grid)"
          strokeWidth="1"
        />;
      }
      return <rect
        key={i}
        {...common}
        className="viz-cell"
        fill={seriesColor(cell.owner)}
        opacity={cell.kind === "mla" ? 0.45 : 1}
        stroke={cell.kind === "kda" ? "var(--ink)" : "none"}
        strokeOpacity={0.35}
        strokeWidth="1"
      />;
    })}
        </svg>
        {hover && <div
      className="viz-tooltip"
      style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -130%)" }}
    >
            {hover.text}
          </div>}
      </div>;
  }, []);

  const PoolSection = useMemo(() => ({
    label,
    result,
    t,
    lang
  }) => {
    const m = result.metrics[Math.min(t, result.totalIterations)];
    const frame = result.frames[Math.min(t, result.totalIterations)];
    const activeIds = [...new Set(frame.flatMap((cell) => cell ? [cell.owner] : []))].sort((a, b) => a - b);
    const pastEvents = result.events.filter((e) => e.t < t);
    return <div className="viz-section">
        <div className="viz-section-head pool-section-head">
          <div className="pool-section-title-row">
            <b>{label}</b>
            {pastEvents.map((e) => <span key={`${e.req}-${e.t}`} className="k3-event">
                {poolEventText(lang, e.t, e.req, e.type)}
              </span>)}
          </div>
          <div className="pool-request-row">
            <span className="pool-row-label">{POOL.activeRequests[lang]} {m.active}</span>
            {activeIds.map((id) => <span key={id} className="pool-request-chip">
                <span className="pool-request-swatch" style={{ background: seriesColor(id) }} />
                R{id}
              </span>)}
            {pastEvents.map((e) => <span
      key={`failed-${e.req}-${e.t}`}
      className="pool-request-chip is-failed"
      title={poolEventText(lang, e.t, e.req, e.type)}
    >
                <span className="pool-request-swatch" style={{ background: seriesColor(e.req) }}>
                  ×
                </span>
                R{e.req}
              </span>)}
          </div>
          <div className="pool-metric-row">
            <span className="pool-metric">
              <strong>KDA {m.kdaPages}</strong>
              <small>= {m.active} {POOL.requests[lang]} × {KDA_PAGES_PER_REQUEST} {POOL.pages[lang]}</small>
            </span>
            <span className="pool-metric">
              <strong>MLA {m.mlaPages}</strong>
              <small>{POOL.mlaGrowth[lang]}</small>
            </span>
            <span className="pool-metric">
              <strong>{POOL.statFree[lang]} {m.freePages} {POOL.pages[lang]}</strong>
              <small>{POOL.remainingCapacity[lang]}</small>
            </span>
            <span className="pool-metric">
              <strong>{POOL.statFailures[lang]} {m.failures}</strong>
            </span>
          </div>
        </div>
        <PoolBar result={result} t={t} lang={lang} />
      </div>;
  }, []);
  const rSplit = useMemo(() => simulatePool("split", POOL_SIZE, SPLIT_AT, TRACE), []);
  const rUnified = useMemo(
    () => simulatePool("unified", POOL_SIZE, SPLIT_AT, TRACE),
    []
  );
  const player = useSimPlayer(rSplit.totalIterations, 2);
  const legend = [
    {
      label: POOL.legendKda[lang],
      swatch: {
        background: "var(--series-1)",
        border: "1px solid color-mix(in srgb, var(--ink) 35%, transparent)"
      }
    },
    { label: POOL.legendMla[lang], swatch: { background: "var(--series-1)", opacity: 0.45 } },
    {
      label: POOL.legendFree[lang],
      swatch: { background: "transparent", border: "1px solid var(--grid)" }
    }
  ];
  return <VizStage
    title={POOL.title[lang]}
    subtitle={POOL.subtitle[lang]}
    player={player}
    lang={lang}
    footer={<Legend items={legend} />}
  >
      <PoolSection label={POOL.splitLabel[lang]} result={rSplit} t={player.t} lang={lang} />
      <PoolSection
    label={POOL.unifiedLabel[lang]}
    result={rUnified}
    t={player.t}
    lang={lang}
  />
    </VizStage>;
}
