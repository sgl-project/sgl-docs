export const LongCat2Deployment = () => {
  const options = {
    deployment: {
      name: 'deployment',
      title: 'Deployment',
      items: [
        { id: 'b300_8gpu', label: '8x B300', subtitle: 'Validated', default: true },
        { id: 'b200_16gpu', label: '16x B200', subtitle: '2 nodes', default: false },
        { id: 'h200_16gpu', label: '16x H200', subtitle: '2 nodes', default: false },
        { id: 'h20_16gpu', label: '16x H20', subtitle: 'Model card', default: false }
      ]
    },
    multithreadLoad: {
      name: 'multithreadLoad',
      title: 'Weight Loading',
      items: [
        { id: 'enabled', label: 'Multithread', default: true },
        { id: 'disabled', label: 'Default', default: false }
      ]
    }
  };

  const getInitialState = () => {
    const initialState = {};
    Object.entries(options).forEach(([key, option]) => {
      const defaultItem = option.items.find(item => item.default);
      initialState[key] = defaultItem ? defaultItem.id : option.items[0].id;
    });
    return initialState;
  };

  const [values, setValues] = useState(getInitialState);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const html = document.documentElement;
      const isDarkMode = html.classList.contains('dark') ||
                         html.getAttribute('data-theme') === 'dark' ||
                         html.style.colorScheme === 'dark';
      setIsDark(isDarkMode);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => observer.disconnect();
  }, []);

  const handleRadioChange = (optionName, value) => {
    setValues(prev => ({ ...prev, [optionName]: value }));
  };

  const generateCommand = () => {
    const isMultiNode = values.deployment !== 'b300_8gpu';
    const tp = isMultiNode ? 16 : 8;
    const ep = isMultiNode ? 16 : 8;
    const modelName = 'meituan-longcat/LongCat-2.0-FP8';

    let cmd = 'python3 -m sglang.launch_server \\\n';
    cmd += `  --model-path ${modelName}`;
    cmd += ' \\\n  --trust-remote-code';
    cmd += ' \\\n  --host 0.0.0.0';
    cmd += ' \\\n  --port 13423';
    cmd += ` \\\n  --tp ${tp}`;
    cmd += ` \\\n  --ep ${ep}`;
    cmd += ' \\\n  --max-running-requests 64';
    cmd += ' \\\n  --mem-fraction-static 0.92';
    cmd += ' \\\n  --chunked-prefill-size 2048';
    cmd += ' \\\n  --nsa-prefill-backend fa3';
    cmd += ' \\\n  --kv-cache-dtype bfloat16';

    if (values.multithreadLoad === 'enabled') {
      cmd += ' \\\n  --model-loader-extra-config \'{\"enable_multithread_load\":true,\"num_threads\":12}\'';
    }

    if (isMultiNode) {
      cmd += ' \\\n  --nnodes 2';
      cmd += ' \\\n  --node-rank <node-rank>';
      cmd += ' \\\n  --dist-init-addr <rank0-host>:20000';
    }

    return cmd;
  };

  const containerStyle = { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '4px' };
  const cardStyle = { padding: '8px 12px', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderLeft: `3px solid ${isDark ? '#E85D4D' : '#D45D44'}`, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '12px', background: isDark ? '#1f2937' : '#fff' };
  const titleStyle = { fontSize: '13px', fontWeight: '600', minWidth: '140px', flexShrink: 0, color: isDark ? '#e5e7eb' : 'inherit' };
  const itemsStyle = { display: 'flex', rowGap: '2px', columnGap: '6px', flexWrap: 'wrap', alignItems: 'center', flex: 1 };
  const labelBaseStyle = { padding: '4px 10px', border: `1px solid ${isDark ? '#9ca3af' : '#d1d5db'}`, borderRadius: '3px', cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: '500', fontSize: '13px', transition: 'all 0.2s', userSelect: 'none', minWidth: '45px', textAlign: 'center', flex: 1, background: isDark ? '#374151' : '#fff', color: isDark ? '#e5e7eb' : 'inherit' };
  const checkedStyle = { background: '#D45D44', color: 'white', borderColor: '#D45D44' };
  const subtitleStyle = { display: 'block', fontSize: '9px', marginTop: '1px', lineHeight: '1.1', opacity: 0.7 };
  const commandDisplayStyle = { flex: 1, padding: '12px 16px', background: isDark ? '#111827' : '#f5f5f5', borderRadius: '6px', fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace", fontSize: '12px', lineHeight: '1.5', color: isDark ? '#e5e7eb' : '#374151', whiteSpace: 'pre-wrap', overflowX: 'auto', margin: 0, border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` };

  return (
    <div style={containerStyle} className="not-prose">
      {Object.entries(options).map(([key, option]) => (
        <div key={key} style={cardStyle}>
          <div style={titleStyle}>{option.title}</div>
          <div style={itemsStyle}>
            {option.items.map(item => {
              const isChecked = values[option.name] === item.id;
              return (
                <label key={item.id} style={{ ...labelBaseStyle, ...(isChecked ? checkedStyle : {}) }}>
                  <input type="radio" name={option.name} value={item.id} checked={isChecked} onChange={() => handleRadioChange(option.name, item.id)} style={{ display: 'none' }} />
                  {item.label}
                  {item.subtitle && <small style={{ ...subtitleStyle, color: isChecked ? 'rgba(255,255,255,0.85)' : 'inherit' }}>{item.subtitle}</small>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <div style={cardStyle}>
        <div style={titleStyle}>Run this Command:</div>
        <pre style={commandDisplayStyle}>{generateCommand()}</pre>
      </div>
    </div>
  );
};
