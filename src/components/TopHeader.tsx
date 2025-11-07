// src/components/TopHeader.tsx
import React, { useState, useMemo } from 'react';
import { Settings, Search, Brain, Check, AlertCircle, ChevronDown, Menu } from 'lucide-react';
import { APISettings, ModelProvider } from '../types';

// SVG Icons from public folder with white filter
const GoogleIcon = () => <img src="/gemini.svg" alt="Google AI" className="w-5 h-5 filter brightness-0 invert" />;
const MistralIcon = () => <img src="/mistral.svg" alt="Mistral AI" className="w-5 h-5 filter brightness-0 invert" />;
const ZhipuIcon = () => <img src="/zhipu.svg" alt="ZhipuAI" className="w-5 h-5 filter brightness-0 invert" />;
const GroqIcon = () => <img src="/groq.svg" alt="Groq" className="w-5 h-5 filter brightness-0 invert" />;

const modelConfig = {
  google: { name: "Google AI", icon: GoogleIcon, models: [{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }, { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }] },
  mistral: { name: "Mistral AI", icon: MistralIcon, models: [{ id: 'mistral-large-latest', name: 'Mistral Large' }, { id: 'mistral-small-latest', name: 'Mistral Small' }] },
  zhipu: { name: "ZhipuAI", icon: ZhipuIcon, models: [{ id: 'glm-4.5-flash', name: 'GLM 4.5 Flash' }] },
  groq: { name: "Groq", icon: GroqIcon, models: [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }] }
};

interface TopHeaderProps {
  settings: APISettings;
  onModelChange: (model: string, provider: ModelProvider) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export function TopHeader({ settings, onModelChange, onOpenSettings, onToggleSidebar }: TopHeaderProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const hasApiKeyForProvider = (provider: ModelProvider): boolean => {
    switch (provider) {
      case 'google': return !!settings.googleApiKey;
      case 'mistral': return !!settings.mistralApiKey;
      case 'zhipu': return !!settings.zhipuApiKey;
      case 'groq': return !!settings.groqApiKey;
      default: return false;
    }
  };

  const { provider: currentProvider, model: currentModel } = useMemo(() => {
    const provider = modelConfig[settings.selectedProvider];
    const model = provider?.models.find(m => m.id === settings.selectedModel);
    return { provider, model };
  }, [settings.selectedProvider, settings.selectedModel]);

  return (
    <header className="flex-shrink-0 w-full h-16 bg-[#181818] border-b border-[var(--color-border)] flex items-center px-4 md:px-6 z-30">
      <div className="flex items-center gap-4 w-full">
        {/* Logo and Mobile Menu */}
        <div className="flex items-center gap-2">
          <button onClick={onToggleSidebar} className="btn-ghost lg:hidden p-2 -ml-2">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/white-logo.png" alt="Logo" className="w-8 h-8" />
            <div className="hidden md:block">
              <h1 className="text-lg font-bold">Pustakam</h1>
              <p className="text-xs text-gray-500 -mt-1.5">injin</p>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Bar */}
        <div className="hidden md:flex items-center relative w-full max-w-lg">
          <Search className="absolute left-3 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-[#282828] border border-transparent rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Model Selector and Settings */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-[#282828] rounded-lg hover:bg-gray-700 transition-colors"
            >
              {currentProvider ? <currentProvider.icon /> : <Brain size={20} />}
              <span className="hidden md:inline text-sm font-medium">{currentModel?.name || "Select Model"}</span>
              <ChevronDown size={16} className={`transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {modelDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-[#1F1F1F] border border-[var(--color-border)] rounded-lg shadow-xl z-50 animate-fade-in-up">
                {(Object.entries(modelConfig) as [ModelProvider, any][]).map(([provider, config]) => (
                  <div key={provider} className="p-1">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400">
                      <config.icon /> {config.name}
                      {!hasApiKeyForProvider(provider) && <AlertCircle className="w-3 h-3 text-red-400 ml-auto" title="API Key missing" />}
                    </div>
                    {config.models.map((model: any) => {
                      const isSelected = settings.selectedModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            if (hasApiKeyForProvider(provider)) {
                              onModelChange(model.id, provider);
                              setModelDropdownOpen(false);
                            } else {
                              onOpenSettings();
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-md transition-colors ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-white/5 disabled:text-gray-600'}`}
                          disabled={!hasApiKeyForProvider(provider)}
                        >
                          <span className="text-sm">{model.name}</span>
                          {isSelected && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className="p-2.5 bg-[#282828] rounded-lg hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
