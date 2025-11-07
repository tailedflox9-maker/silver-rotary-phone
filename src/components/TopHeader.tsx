// src/components/TopHeader.tsx
import React, { useState, useMemo } from 'react';
import { Settings, Brain, Check, AlertCircle, ChevronDown, BookOpen, Trash2, Plus, Search } from 'lucide-react';
import { APISettings, ModelProvider, BookProject } from '../types';

// --- Helper Icons & Configs ---

const GoogleIcon = () => <img src="/gemini.svg" alt="Google AI" className="w-5 h-5 filter brightness-0 invert" />;
const MistralIcon = () => <img src="/mistral.svg" alt="Mistral AI" className="w-5 h-5 filter brightness-0 invert" />;
const ZhipuIcon = () => <img src="/zhipu.svg" alt="ZhipuAI" className="w-5 h-5 filter brightness-0 invert" />;
const GroqIcon = () => <img src="/groq.svg" alt="Groq" className="w-5 h-5 filter brightness-0 invert" />;

const modelConfig = {
  google: {
    name: "Google AI", icon: GoogleIcon, models: [
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Fast, lightweight model' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Enhanced lightweight model' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Balanced speed and capability' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest flash model' },
      { id: 'gemma-3-27b-it', name: 'Gemma 3 27B IT', description: 'High-quality instruction-tuned model' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable model' },
    ]
  },
  mistral: {
    name: "Mistral AI", icon: MistralIcon, models: [
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast and cost-effective' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced performance' },
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most powerful model' },
      { id: 'pixtral-large-latest', name: 'Pixtral Large', description: 'Multimodal capabilities' },
    ]
  },
  zhipu: { name: "ZhipuAI", icon: ZhipuIcon, models: [{ id: 'glm-4.5-flash', name: 'GLM 4.5 Flash', description: 'Chinese AI model' }] },
  groq: {
    name: "Groq", icon: GroqIcon, models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Powerful & versatile' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open-source model' },
      { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Medium open-source model' },
      { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct (0905)', description: 'Moonshot AI instruction model' },
      { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', description: 'Moonshot AI latest' },
    ]
  }
};

interface TopHeaderProps {
  settings: APISettings;
  books: BookProject[];
  currentBookId: string | null;
  onModelChange: (model: string, provider: ModelProvider) => void;
  onOpenSettings: () => void;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  onNewBook: () => void;
}

export function TopHeader({ settings, books, currentBookId, onModelChange, onOpenSettings, onSelectBook, onDeleteBook, onNewBook }: TopHeaderProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sortedBooks = useMemo(() => books.filter(book => book.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [books, searchQuery]);

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
    const providerKey = settings.selectedProvider as ModelProvider;
    const provider = modelConfig[providerKey];
    const model = provider?.models.find(m => m.id === settings.selectedModel);
    return { provider, model };
  }, [settings.selectedProvider, settings.selectedModel]);

  return (
    <header className="relative flex-shrink-0 w-full h-16 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex items-center px-6 md:px-8 z-30">
      <div className="flex items-center gap-3">
        <img src="/white-logo.png" alt="Logo" className="w-8 h-8" />
        <div className="hidden md:block">
          <h1 className="text-lg font-bold tracking-tight">Pustakam</h1>
          <p className="text-xs text-[var(--color-text-secondary)] -mt-1">injin</p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center justify-center w-full max-w-2xl">
        <div className="px-4 py-2 bg-[var(--color-bg)]/50 border border-[var(--color-border)]/50 rounded-lg">
          <p className="text-sm text-gray-400 text-center">
            📚 <span className="text-gray-300">Learn anything, create knowledge books</span> - AI-powered learning companion
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* --- Model Selector --- */}
        <div className="relative">
          <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} className="flex items-center gap-2.5 px-3.5 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:border-gray-600 transition-colors">
            {currentProvider ? <currentProvider.icon /> : <Brain size={18} />}
            <span className="hidden md:inline text-sm font-medium text-gray-300">{currentModel?.name || "Select Model"}</span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[#1A1A1A] border border-[var(--color-border)] rounded-xl shadow-2xl z-50 max-h-[32rem] overflow-y-auto animate-fade-in-up">
              {(Object.entries(modelConfig) as [ModelProvider, any][]).map(([provider, config]) => (
                <div key={provider} className="p-3 border-b border-white/5 last:border-b-0">
                  <div className="flex items-center gap-2.5 px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <config.icon /> {config.name}
                    {!hasApiKeyForProvider(provider) && <div className="ml-auto flex items-center gap-1.5 text-red-400 normal-case"><AlertCircle size={12} /> No Key</div>}
                  </div>
                  <div className="space-y-1 mt-2">
                    {config.models.map((model: any) => {
                      const isSelected = settings.selectedModel === model.id && settings.selectedProvider === provider;
                      return (
                        <button key={model.id} onClick={() => { if (hasApiKeyForProvider(provider)) { onModelChange(model.id, provider); setModelDropdownOpen(false); } else { onOpenSettings(); } }} disabled={!hasApiKeyForProvider(provider)} className={`w-full text-left rounded-lg transition-all p-3 ${isSelected ? 'bg-white/5 border border-white/10' : hasApiKeyForProvider(provider) ? 'hover:bg-white/5 border border-transparent' : 'text-gray-600 cursor-not-allowed border border-transparent'}`} >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{model.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
                            </div>
                            {isSelected && <Check size={16} className="text-gray-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Library Dropdown --- */}
        <div className="relative">
          <button onClick={() => setLibraryOpen(!libraryOpen)} className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:border-gray-600 transition-colors" title="Library & Settings">
            <BookOpen size={18} />
          </button>
          {libraryOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[#1A1A1A] border border-[var(--color-border)] rounded-xl shadow-2xl z-50 animate-fade-in-up">
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search library..." className="w-full bg-white/5 border border-transparent rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-white/10 transition-colors text-white placeholder-gray-500" />
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-3">
                {sortedBooks.map(book => (
                  <div key={book.id} onClick={() => { onSelectBook(book.id); setLibraryOpen(false); }} className={`group flex items-center justify-between w-full rounded-lg cursor-pointer p-3 mb-2 transition-all ${currentBookId === book.id ? 'bg-white/5 border border-white/10' : 'border border-transparent hover:bg-white/5'}`}>
                    <span className="text-sm font-medium truncate text-gray-200">{book.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {books.length === 0 && <div className="text-center text-sm text-gray-500 py-8">No books yet.</div>}
              </div>
              <div className="border-t border-white/5 p-3 space-y-1">
                <button onClick={() => { onNewBook(); setLibraryOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                  <Plus size={16} /> New Book
                </button>
                <button onClick={() => { onOpenSettings(); setLibraryOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                  <Settings size={16} /> Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {(modelDropdownOpen || libraryOpen) && <div className="fixed inset-0 z-40" onClick={() => { setModelDropdownOpen(false); setLibraryOpen(false); }} />}
    </header>
  );
}
