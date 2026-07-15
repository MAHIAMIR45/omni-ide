import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Cpu, Check, Zap } from 'lucide-react';

const DEFAULT_MODEL = 'mcode/mimo-auto';

const MODELS = {
  categories: [
    {
      label: 'OMNI Fast',
      emoji: '⚡',
      models: [
        { value: 'mcode/mimo-auto', label: 'mimo-auto', badge: 'Default' },
      ],
    },
    {
      label: 'Omni Custom',
      emoji: '🔮',
      models: [
        { value: 'oc/big-pickle', label: 'big-pickle', badge: 'Smart' },
        { value: 'oc/deepseek-v4-flash-free', label: 'deepseek-v4-flash' },
        { value: 'oc/mimo-v2.5-free', label: 'mimo-v2.5' },
        { value: 'oc/hy3-free', label: 'hy3' },
        { value: 'oc/nemotron-3-ultra-free', label: 'nemotron-3-ultra' },
        { value: 'oc/north-mini-code-free', label: 'north-mini-code' },
      ],
    },
    {
      label: 'Qwen Web',
      emoji: '🌐',
      models: [
        { value: 'qwen-web/qwen3.7-max', label: 'qwen3.7-max', badge: 'Best' },
        { value: 'qwen-web/qwen3.7-plus', label: 'qwen3.7-plus' },
        { value: 'qwen-web/qwen3.6-plus', label: 'qwen3.6-plus' },
      ],
    },
    {
      label: 'Ollama Cloud',
      emoji: '☁️',
      models: [
        { value: 'ollamacloud/minimax-m3', label: 'minimax-m3' },
        { value: 'ollamacloud/gemma4:31b', label: 'gemma4 31B' },
        { value: 'ollamacloud/nemotron-3-super', label: 'nemotron-3-super' },
        { value: 'ollamacloud/gpt-oss:20b', label: 'gpt-oss 20B' },
        { value: 'ollamacloud/minimax-m2.1', label: 'minimax-m2.1' },
        { value: 'ollamacloud/qwen3-coder-next', label: 'qwen3-coder-next' },
        { value: 'ollamacloud/devstral-small-2:24b', label: 'devstral-small 24B' },
        { value: 'ollamacloud/gemma3:27b', label: 'gemma3 27B' },
        { value: 'ollamacloud/gemma3:12b', label: 'gemma3 12B' },
        { value: 'ollamacloud/ministral-3:8b', label: 'ministral 8B' },
        { value: 'ollamacloud/minimax-m2.5', label: 'minimax-m2.5' },
      ],
    },
    {
      label: 'Mistral',
      emoji: '🌬️',
      models: [
        { value: 'mistral/mistral-large-latest', label: 'mistral-large' },
        { value: 'mistral/mistral-medium-3-5', label: 'mistral-medium' },
        { value: 'mistral/mistral-small-latest', label: 'mistral-small' },
        { value: 'mistral/devstral-latest', label: 'devstral' },
        { value: 'mistral/codestral-latest', label: 'codestral', badge: 'Code' },
      ],
    },
  ],
};

const ModelSelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);
  const buttonRef = useRef(null);

  const currentModel = (() => {
    for (const cat of MODELS.categories) {
      const m = cat.models.find(m => m.value === value);
      if (m) return { ...m, catLabel: cat.label, catEmoji: cat.emoji };
    }
    return { label: value, catEmoji: '🤖' };
  })();

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Determine if dropdown should open up or down
  const [openUpward, setOpenUpward] = useState(false);
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 320);
    }
  }, [open]);

  return (
    <div className="relative" ref={dropRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-omni-bg border border-omni-border
                   text-xs text-omni-muted hover:text-omni-text hover:border-omni-accent/40
                   transition-colors max-w-[140px]"
      >
        <span className="text-xs">{currentModel.catEmoji}</span>
        <span className="truncate flex-1 text-left">{currentModel.label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop on mobile */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className={`
            absolute z-50 w-64 bg-omni-panel border border-omni-border rounded-2xl
            shadow-2xl shadow-black/60 overflow-hidden
            ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}
            right-0
            sm:right-auto sm:left-0
          `}>
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-omni-border bg-omni-bg/50">
              <p className="text-xs font-semibold text-omni-text">Select Model</p>
              <p className="text-[10px] text-omni-muted mt-0.5">
                {MODELS.categories.reduce((a, c) => a + c.models.length, 0)} models available
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto custom-scroll">
              {MODELS.categories.map((cat) => (
                <div key={cat.label}>
                  <div className="px-3 py-1.5 flex items-center gap-1.5 bg-omni-bg/30 border-b border-omni-border/40 sticky top-0">
                    <span className="text-xs">{cat.emoji}</span>
                    <span className="text-xs font-semibold text-omni-muted uppercase tracking-wider">{cat.label}</span>
                  </div>
                  {cat.models.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => { onChange(m.value); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left
                                  transition-colors hover:bg-omni-accent/5
                                  ${value === m.value ? 'bg-omni-accent/8 text-omni-accent' : 'text-omni-muted hover:text-omni-text'}`}
                    >
                      <span className="flex-1">{m.label}</span>
                      {m.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-omni-accent/15 text-omni-accent font-medium shrink-0">
                          {m.badge}
                        </span>
                      )}
                      {value === m.value && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { MODELS, DEFAULT_MODEL };
export default ModelSelector;
