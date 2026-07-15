import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Cpu, Check } from 'lucide-react';
import axios from 'axios';

const DEFAULT_MODEL = 'mcode/mimo-auto';

const MODELS = {
  categories: [
    {
      label: 'mcode',
      models: [{ value: 'mcode/mimo-auto', label: 'mimo-auto (Default)' }],
    },
    {
      label: 'oc (Omni Custom)',
      models: [
        { value: 'oc/big-pickle', label: 'big-pickle' },
        { value: 'oc/deepseek-v4-flash-free', label: 'deepseek-v4-flash-free' },
        { value: 'oc/mimo-v2.5-free', label: 'mimo-v2.5-free' },
        { value: 'oc/hy3-free', label: 'hy3-free' },
        { value: 'oc/nemotron-3-ultra-free', label: 'nemotron-3-ultra-free' },
        { value: 'oc/north-mini-code-free', label: 'north-mini-code-free' },
      ],
    },
    {
      label: 'Qwen Web',
      models: [
        { value: 'qwen-web/qwen3.7-max', label: 'qwen3.7-max' },
        { value: 'qwen-web/qwen3.7-plus', label: 'qwen3.7-plus' },
        { value: 'qwen-web/qwen3.6-plus', label: 'qwen3.6-plus' },
      ],
    },
    {
      label: 'Ollama Cloud',
      models: [
        { value: 'ollamacloud/minimax-m3', label: 'minimax-m3' },
        { value: 'ollamacloud/gemma4:31b', label: 'gemma4:31b' },
        { value: 'ollamacloud/nemotron-3-super', label: 'nemotron-3-super' },
        { value: 'ollamacloud/gpt-oss:20b', label: 'gpt-oss:20b' },
        { value: 'ollamacloud/minimax-m2.1', label: 'minimax-m2.1' },
        { value: 'ollamacloud/nemotron-3-nano:30b', label: 'nemotron-3-nano:30b' },
        { value: 'ollamacloud/qwen3-coder-next', label: 'qwen3-coder-next' },
        { value: 'ollamacloud/devstral-small-2:24b', label: 'devstral-small-2:24b' },
        { value: 'ollamacloud/gemma3:27b', label: 'gemma3:27b' },
        { value: 'ollamacloud/gemma3:4b', label: 'gemma3:4b' },
        { value: 'ollamacloud/gemma3:12b', label: 'gemma3:12b' },
        { value: 'ollamacloud/ministral-3:8b', label: 'ministral-3:8b' },
        { value: 'ollamacloud/minimax-m2.5', label: 'minimax-m2.5' },
        { value: 'ollamacloud/ministral-3:14b', label: 'ministral-3:14b' },
      ],
    },
    {
      label: 'Mistral',
      models: [
        { value: 'mistral/mistral-large-latest', label: 'mistral-large-latest' },
        { value: 'mistral/mistral-medium-3-5', label: 'mistral-medium-3-5' },
        { value: 'mistral/mistral-small-latest', label: 'mistral-small-latest' },
        { value: 'mistral/devstral-latest', label: 'devstral-latest' },
        { value: 'mistral/codestral-latest', label: 'codestral-latest' },
      ],
    },
  ],
};

const ModelSelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  const currentLabel = (() => {
    for (const cat of MODELS.categories) {
      const m = cat.models.find(m => m.value === value);
      if (m) return `${cat.label} / ${m.label}`;
    }
    return value;
  })();

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-omni-bg border border-omni-border
                   text-xs text-omni-muted hover:text-omni-text hover:border-omni-accent/40 transition-colors
                   max-w-48 truncate"
      >
        <Cpu className="w-3 h-3 shrink-0 text-omni-accent" />
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-omni-panel border border-omni-border
                        rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fade-in">
          <div className="max-h-80 overflow-y-auto custom-scroll">
            {MODELS.categories.map((cat) => (
              <div key={cat.label}>
                <div className="px-3 py-1.5 text-xs font-semibold text-omni-accent/70 uppercase tracking-wider
                                bg-omni-bg/50 border-b border-omni-border/50 sticky top-0">
                  {cat.label}
                </div>
                {cat.models.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => { onChange(m.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left
                                transition-colors hover:bg-omni-accent/5
                                ${value === m.value ? 'text-omni-accent' : 'text-omni-muted hover:text-omni-text'}`}
                  >
                    <span>{m.label}</span>
                    {value === m.value && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { MODELS, DEFAULT_MODEL };
export default ModelSelector;
