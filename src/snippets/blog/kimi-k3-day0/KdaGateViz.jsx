// KdaGateViz — interactive visualization for the Kimi K3 day-0 support blog post.
// Ported from https://github.com/Ccyest/AI-Infra-Visualized (src/viz/kimi-k3-day0).
// Mintlify evaluates snippet components in isolation, so all shared helpers
// (viz stage/player/legend, copy strings, sim engines) live inside the component.
// Sub-components are frozen with useMemo(() => Comp, []) for stable identity.
export const KdaGateViz = ({ lang = "zh" }) => {
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

  const RETENTIONS = [1, 0.8, 0.5, 0.3, 0.1];

  const WRITE_STRENGTHS = [1, 0.8, 0.5, 0.3, 0];

  const TOKENS = [
    { label: "A=1", kind: "write", color: 1 },
    { label: "B=2", kind: "write", color: 2 },
    { label: "A=4", kind: "write", color: 4 },
    { label: "qₐ?", kind: "query", color: 0 }
  ];

  const COPY = {
    title: { zh: "KDA 图示", en: "KDA diagram" },
    subtitle: { zh: "调整 α₁、α₂ 和 β，观察状态如何变化", en: "Adjust α₁, α₂, and β to see how the state changes" },
    entering: { zh: "① A=4 进入前的 S", en: "① S before A=4" },
    gated: { zh: "② Diag(α) 后的 S", en: "② S after Diag(α)" },
    final: { zh: "③ 沿 kₐ delta 后的 S", en: "③ S after delta along kₐ" }
  };

  const tr = (lang, value) => {
    return value[lang];
  }

  const format = (value) => {
    return String(Number(value.toFixed(2)));
  }

  const baseTerms = () => {
    return [
      { id: "a-old", label: "A", vector: KEY_A, scalar: 1, color: 1 },
      { id: "b", label: "B", vector: KEY_B, scalar: 2, color: 2 }
    ];
  }

  const earlyState = (completed) => {
    if (completed <= 0) return [];
    const terms = [{ id: "a-old", label: "A", vector: KEY_A, scalar: 1, color: 1 }];
    if (completed >= 2) terms.push({ id: "b", label: "B", vector: KEY_B, scalar: 2, color: 2 });
    return terms;
  }

  const ParameterRow = useMemo(() => ({
    label,
    value,
    options = RETENTIONS,
    onChange
  }) => {
    return <span className="kda-parameter-row">
        <b>{label}</b>
        <span className="viz-presets" role="group" aria-label={label}>
          {options.map((option) => <button key={option} type="button" className={`viz-btn${value === option ? " primary" : ""}`} onClick={() => onChange(option)}>{option}</button>)}
        </span>
      </span>;
  }, []);
  const [alpha1, setAlpha1] = useState(0.8);
  const [alpha2, setAlpha2] = useState(0.3);
  const [beta, setBeta] = useState(1);
  const player = useSimPlayer(TOKENS.length, 1.2);
  const t = Math.min(player.t, TOKENS.length);
  const showingRewrite = t >= 3;
  const entering = showingRewrite ? baseTerms() : earlyState(Math.max(0, t - 1));
  const gated = showingRewrite ? baseTerms().map((term) => ({ ...term, rowScale: [alpha1, alpha2] })) : entering;
  const oldReadA = stateRead(gated, KEY_A);
  const correction = showingRewrite ? 4 - oldReadA : t === 1 ? 1 : t === 2 ? 2 : 0;
  const deltaWrite = beta * correction;
  const final = showingRewrite ? [...gated, { id: "delta-a", label: "ΔA", vector: KEY_A, scalar: deltaWrite, color: 4 }] : t === 1 ? earlyState(1) : t === 2 ? earlyState(2) : [];
  const readA = stateRead(final, KEY_A);
  const readB = stateRead(final, KEY_B);
  return <VizStage
    title={tr(lang, COPY.title)}
    subtitle={tr(lang, COPY.subtitle)}
    player={player}
    lang={lang}
    headExtra={<span className="kda-parameter-controls" aria-label={lang === "zh" ? "A=4 这一步的保留系数与写入强度" : "retentions and write strength for the A=4 step"}>
          <ParameterRow label="α₁" value={alpha1} onChange={setAlpha1} />
          <ParameterRow label="α₂" value={alpha2} onChange={setAlpha2} />
          <ParameterRow label="β" value={beta} options={WRITE_STRENGTHS} onChange={setBeta} />
        </span>}
  >
      <TokenTimeline items={TOKENS} t={t} />
      <div className="key-channel-workbench three-state">
        <KeySpacePanel lang={lang} />
        <ChannelStatePanel
    title={showingRewrite ? tr(lang, COPY.entering) : lang === "zh" ? "本步进入的 S" : "S entering this step"}
    terms={entering}
    lang={lang}
    note={showingRewrite ? lang === "zh" ? "A/B 已在每条 row 内相加" : "A/B already add inside every row" : void 0}
  />
        <StateOperation label="Diag(α)" detail={showingRewrite ? `ch₁×${alpha1}, ch₂×${alpha2}` : "α=1"} />
        <ChannelStatePanel
    title={tr(lang, COPY.gated)}
    terms={gated}
    lang={lang}
    accent={showingRewrite}
    note={showingRewrite ? lang === "zh" ? "整行缩放：A 与 B 一起衰减" : "whole-row scaling: A and B decay together" : void 0}
  />
        <StateOperation
    label={lang === "zh" ? "沿完整 kₐ 做 delta" : "delta along full kₐ"}
    detail={showingRewrite ? `+kₐ×${beta}×${format(correction)} = +kₐ×${format(deltaWrite)}` : lang === "zh" ? "首次写入" : "first write"}
  />
        <ChannelStatePanel
    title={tr(lang, COPY.final)}
    terms={final}
    lang={lang}
    accent={t > 0}
    note={showingRewrite ? `qₐ=${format(readA)} · qᵦ=${format(readB)}` : void 0}
  />
      </div>
      <ContributionLegend lang={lang} third="delta" />
    </VizStage>;
}
