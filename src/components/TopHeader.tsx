// src/components/TopHeader.tsx
import React, { useState, useMemo } from 'react';
import { Settings, Search, Brain, Check, AlertCircle, ChevronDown, BookOpen, Trash2, Plus, Loader2, CheckCircle, Clock, Calendar, Zap } from 'lucide-react';
import { APISettings, ModelProvider, BookProject } from '../types';

// Icons
const GoogleIcon = () => <img src="/gemini.svg" alt="Google AI" className="w-5 h-5 filter brightness-0 invert" />;
const MistralIcon = () => <img src="/mistral.svg" alt="Mistral AI" className="w-5 h-5 filter brightness-0 invert" />;
const ZhipuIcon = () => <img src="/zhipu.svg" alt="ZhipuAI" className="w-5 h-5 filter brightness-0 invert" />;
const GroqIcon = () => <img src="/groq.svg" alt="Groq" className="w-5 h-5 filter brightness-0 invert" />;

const modelConfig = {
  google: {
    name: "Google AI", icon: GoogleIcon, models: [
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Fast, lightweight' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Enhanced lightweight' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Balanced speed' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest flash' },
      { id: 'gemma-3-27b-it', name: 'Gemma 3 27B IT', description: 'High-quality tuned' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
    ]
  },
  mistral: {
    name: "Mistral AI", icon: MistralIcon, models: [
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast, cost-effective' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced performance' },
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most powerful' },
      { id: 'pixtral-large-latest', name: 'Pixtral Large', description: 'Multimodal' },
    ]
  },
  zhipu: { 
    name: "ZhipuAI", 
    icon: ZhipuIcon, 
    models: [{ id: 'glm-4.5-flash', name: 'GLM 4.5 Flash', description: 'Chinese AI model' }] 
  },
  groq: {
    name: "Groq", icon: GroqIcon, models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Powerful, versatile' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open-source' },
      { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Medium open-source' },
      { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct (0905)', description: 'Moonshot instruction' },
      { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', description: 'Moonshot latest' },
    ]
  }
};

const getStatusInfo = (status: BookProject['status']) => {
  const statusMap: Record<BookProject['status'], { text: string; icon: React.ElementType; color: string; animate?: boolean }> = {
    planning: { text: 'Planning', icon: Clock, color: 'text-yellow-400' },
    generating_roadmap: { text: 'Creating Roadmap', icon: Loader2, color: 'text-blue-400', animate: true },
    roadmap_completed: { text: 'Ready', icon: CheckCircle, color: 'text-green-400' },
    generating_content: { text: 'Writing', icon: Loader2, color: 'text-blue-400', animate: true },
    assembling: { text: 'Assembling', icon: Loader2, color: 'text-purple-400', animate: true },
    completed: { text: 'Complete', icon: CheckCircle, color: 'text-green-400' },
    error: { text: 'Error', icon: AlertCircle, color: 'text-red-400' },
  };
  return statusMap[status];
};

interface TopHeaderProps {
  settings: APISettings;
  books: BookProject[];
  currentBook: BookProject | null;
  onModelChange: (model: string, provider: ModelProvider) => void;
  onOpenSettings: () => void;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  onNewBook: () => void;
}

export function TopHeader({ settings, books, currentBook, onModelChange, onOpenSettings, onSelectBook, onDeleteBook, onNewBook }: TopHeaderProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sortedBooks = useMemo(() => 
    books
      .filter(book => book.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [books, searchQuery]
  );

  const stats = useMemo(() => ({
    total: books.length,
    completed: books.filter(b => b.status === 'completed').length,
    inProgress: books.filter(b => ['generating_roadmap', 'generating_content', 'assembling'].includes(b.status)).length,
  }), [books]);

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

  const currentBookStatusInfo = currentBook ? getStatusInfo(currentBook.status) : null;

  return (
    <header className="relative flex-shrink-0 w-full h-16 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex items-center px-4 md:px-6 z-30">
      {/* Logo Section */}
      <div className="flex items-center gap-2.5">
        <img src="/white-logo.png" alt="Logo" className="w-8 h-8" />
        <div className="hidden md:block">
          <h1 className="text-lg font-bold">Pustakam</h1>
          <p className="text-xs text-[var(--color-text-secondary)] -mt-1.5">injin</p>
        </div>
      </div>

      {/* Center Section - Clean Minimal Context */}
      <div className="flex-1 flex items-center justify-center px-4 min-w-0">
        {currentBook && currentBookStatusInfo ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-white truncate max-w-xs hidden md:block">{currentBook.title}</span>
            <span className="text-gray-600 hidden md:block">/</span>
            <div className={`flex items-center gap-1.5 ${currentBookStatusInfo.color}`}>
              <currentBookStatusInfo.icon size={14} className={currentBookStatusInfo.animate ? 'animate-spin' : ''} />
              <span className="text-xs font-medium">{currentBookStatusInfo.text}</span>
            </div>
            {['generating_roadmap', 'generating_content', 'assembling'].includes(currentBook.status) && currentBook.progress !== undefined && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-xs font-medium text-gray-400">{currentBook.progress}%</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-gray-500" />
              <span className="text-xs text-gray-400">{stats.total} books</span>
            </div>
            {stats.completed > 0 && (
              <>
                <span className="text-gray-700">•</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-xs text-gray-400">{stats.completed} done</span>
                </div>
              </>
            )}
            {stats.inProgress > 0 && (
              <>
                <span className="text-gray-700">•</span>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-blue-500" />
                  <span className="text-xs text-gray-400">{stats.inProgress} active</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Section - Minimal Actions */}
      <div className="flex items-center gap-2">
        {/* Model Selector - Claude.ai Style */}
        <div className="relative">
          <button 
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)} 
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-card)] transition-colors text-sm"
          >
            {currentProvider ? <currentProvider.icon /> : <Brain size={18} />}
            <span className="hidden md:inline font-medium text-sm">{currentModel?.name || "Model"}</span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {modelDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto animate-fade-in-up">
              {(Object.entries(modelConfig) as [ModelProvider, any][]).map(([provider, config]) => (
                <div key={provider}>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                    <div className="flex items-center gap-2">
                      <config.icon />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{config.name}</span>
                    </div>
                    {!hasApiKeyForProvider(provider) && (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle size={12} />
                        <span>No Key</span>
                      </div>
                    )}
                  </div>
                  <div className="py-1">
                    {config.models.map((model: any) => {
                      const isSelected = settings.selectedModel === model.id && settings.selectedProvider === provider;
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
                          disabled={!hasApiKeyForProvider(provider)}
                          className={`w-full text-left px-3 py-2 transition-colors ${
                            isSelected 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : hasApiKeyForProvider(provider) 
                                ? 'hover:bg-[var(--color-bg)] text-gray-300' 
                                : 'text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium">{model.name}</div>
                              <div className="text-xs text-gray-500">{model.description}</div>
                            </div>
                            {isSelected && <Check size={14} className="text-blue-400" />}
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

        {/* Library Dropdown - Claude.ai Style */}
        <div className="relative">
          <button 
            onClick={() => setLibraryOpen(!libraryOpen)} 
            className="relative p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-card)] transition-colors"
            title="Library"
          >
            <BookOpen size={18} />
            {stats.inProgress > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>
          
          {libraryOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 animate-fade-in-up">
              {/* Search */}
              <div className="p-3 border-b border-[var(--color-border)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books..."
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                </div>
              </div>

              {/* Books List */}
              <div className="max-h-80 overflow-y-auto">
                {sortedBooks.map(book => {
                  const statusInfo = getStatusInfo(book.status);
                  const isActive = currentBook?.id === book.id;
                  
                  return (
                    <div
                      key={book.id}
                      onClick={() => {
                        onSelectBook(book.id);
                        setLibraryOpen(false);
                      }}
                      className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-[var(--color-border)] last:border-0 transition-colors ${
                        isActive ? 'bg-blue-500/10' : 'hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className={`text-sm font-medium truncate ${isActive ? 'text-blue-400' : 'text-white'}`}>
                          {book.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                            <statusInfo.icon size={10} className={statusInfo.animate ? 'animate-spin' : ''} />
                            <span>{statusInfo.text}</span>
                          </div>
                          <span className="text-gray-600 text-xs">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(book.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBook(book.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                {books.length === 0 && (
                  <div className="text-center py-8 px-4">
                    <BookOpen size={32} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">No books yet</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-2 border-t border-[var(--color-border)] space-y-1">
                <button
                  onClick={() => {
                    onNewBook();
                    setLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  New Book
                </button>
                <button
                  onClick={() => {
                    onOpenSettings();
                    setLibraryOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[var(--color-bg)] rounded-lg transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {(modelDropdownOpen || libraryOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setModelDropdownOpen(false);
            setLibraryOpen(false);
          }}
        />
