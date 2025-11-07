// src/components/TopHeader.tsx
import React, { useState, useMemo } from 'react';
import { Settings, Search, Brain, Check, AlertCircle, ChevronDown, Menu, BookOpen, Trash2, Plus, User, Loader2, CheckCircle, Clock } from 'lucide-react';
import { APISettings, ModelProvider, BookProject, BookCategory } from '../types';

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
  currentBook: BookProject | null; // Pass the whole book object for title and status
  onModelChange: (model: string, provider: ModelProvider) => void;
  onOpenSettings: () => void;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  onNewBook: () => void;
}

// --- NEW HELPER FOR STATUS ICON ---
const getStatusInfo = (status: BookProject['status']) => {
    const statusMap: Record<BookProject['status'], { text: string; icon: React.ElementType; color: string; animate?: boolean }> = {
      planning: { text: 'Planning', icon: Clock, color: 'text-yellow-400' },
      generating_roadmap: { text: 'Creating Roadmap', icon: Loader2, color: 'text-blue-400', animate: true },
      roadmap_completed: { text: 'Roadmap Complete', icon: CheckCircle, color: 'text-green-400' },
      generating_content: { text: 'Generating Content', icon: Loader2, color: 'text-blue-400', animate: true },
      assembling: { text: 'Assembling', icon: Loader2, color: 'text-purple-400', animate: true },
      completed: { text: 'Completed', icon: CheckCircle, color: 'text-green-400' },
      error: { text: 'Error', icon: AlertCircle, color: 'text-red-400' },
    };
    return statusMap[status] || { text: 'Unknown', icon: AlertCircle, color: 'text-gray-400' };
};

export function TopHeader({ settings, books, currentBook, onModelChange, onOpenSettings, onSelectBook, onDeleteBook, onNewBook }: TopHeaderProps) {
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

  // --- GET CURRENT BOOK STATUS FOR DISPLAY ---
  const currentBookStatusInfo = currentBook ? getStatusInfo(currentBook.status) : null;


  return (
    <header className="relative flex-shrink-0 w-full h-16 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex items-center px-4 md:px-6 z-30">
      <div className="flex items-center gap-2.5">
        <img src="/white-logo.png" alt="Logo" className="w-8 h-8" />
        <div className="hidden md:block">
          <h1 className="text-lg font-bold">Pustakam</h1>
          <p className="text-xs text-[var(--color-text-secondary)] -mt-1.5">injin</p>
        </div>
      </div>

      {/* --- REPLACEMENT FOR SEARCH BAR: CONTEXTUAL DISPLAY --- */}
      <div className="flex-1 flex items-center justify-center px-4">
        {currentBook && currentBookStatusInfo && (
            <div className="flex items-center gap-3 animate-fade-in text-sm">
                <span className="font-semibold text-white truncate max-w-xs">{currentBook.title}</span>
                <span className="text-[var(--color-text-secondary)]">/</span>
                <div className={`flex items-center gap-1.5 ${currentBookStatusInfo.color}`}>
                    <currentBookStatusInfo.icon size={14} className={currentBookStatusInfo.animate ? 'animate-spin' : ''} />
                    <span className="text-xs font-medium">{currentBookStatusInfo.text}</span>
                </div>
            </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* --- Model Selector --- */}
        <div className="relative">
          <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-card)] transition-colors">
            {currentProvider ? <currentProvider.icon /> : <Brain size={20} />}
            <span className="hidden md:inline text-sm font-medium">{currentModel?.name || "Select Model"}</span>
            <ChevronDown size={16} className={`transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-[#1F1F1F] border border-[var(--color-border)] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto animate-fade-in-up">
              {(Object.entries(modelConfig) as [ModelProvider, any][]).map(([provider, config]) => (
                <div key={provider} className="p-1">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 border-b border-white/5">
                    <config.icon /> {config.name}
                    {!hasApiKeyForProvider(provider) && <div className="ml-auto flex items-center gap-1 text-red-400"><AlertCircle size={12} /> No Key</div>}
                  </div>
                  <div className="py-1">
                    {config.models.map((model: any) => {
                      const isSelected = settings.selectedModel === model.id && settings.selectedProvider === provider;
                      return (
                        <button key={model.id} onClick={() => { if (hasApiKeyForProvider(provider)) { onModelChange(model.id, provider); setModelDropdownOpen(false); } else { onOpenSettings(); } }} disabled={!hasApiKeyForProvider(provider)} className={`w-full text-left rounded-md transition-colors p-3 ${isSelected ? 'bg-blue-500/20' : hasApiKeyForProvider(provider) ? 'hover:bg-white/5' : 'text-gray-600 cursor-not-allowed'}`} >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>{model.name}</div>
                              <div className="text-xs text-gray-500">{model.description}</div>
                            </div>
                            {isSelected && <Check size={16} className="text-blue-300" />}
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
          <button onClick={() => setLibraryOpen(!libraryOpen)} className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-card)] transition-colors" title="Library & Settings">
            <BookOpen size={20} />
          </button>
          {libraryOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[#1F1F1F] border border-[var(--color-border)] rounded-lg shadow-xl z-50 animate-fade-in-up">
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search library..." className="w-full bg-white/5 border-transparent rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10" />
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {sortedBooks.map(book => (
                  <div key={book.id} onClick={() => { onSelectBook(book.id); setLibraryOpen(false); }} className={`group flex items-center justify-between w-full rounded-md cursor-pointer p-3 ${currentBook?.id === book.id ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-white/5'}`}>
                    <span className="text-sm font-medium truncate">{book.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-900/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {books.length === 0 && <div className="text-center text-sm text-gray-500 py-8">No books yet.</div>}
              </div>
              <div className="border-t border-white/10 p-2 space-y-1">
                <button onClick={() => { onNewBook(); setLibraryOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-md">
                  <Plus size={16} /> New Book
                </button>
                <button onClick={() => { onOpenSettings(); setLibraryOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-md">
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
