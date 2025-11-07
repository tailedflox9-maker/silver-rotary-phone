// src/components/TopHeader.tsx
import React, { useState, useMemo } from 'react';
import { Settings, Search, Brain, Check, AlertCircle, ChevronDown, BookOpen, Trash2, Plus, Loader2, CheckCircle, Clock, Calendar } from 'lucide-react';
import { APISettings, ModelProvider, BookProject } from '../types';

// Icons
const GoogleIcon = () => <img src="/gemini.svg" alt="Google AI" className="w-5 h-5 filter brightness-0 invert" />;
const MistralIcon = () => <img src="/mistral.svg" alt="Mistral AI" className="w-5 h-5 filter brightness-0 invert" />;
const ZhipuIcon = () => <img src="/zhipu.svg" alt="ZhipuAI" className="w-5 h-5 filter brightness-0 invert" />;
const GroqIcon = () => <img src="/groq.svg" alt="Groq" className="w-5 h-5 filter brightness-0 invert" />;

const modelConfig = {
  google: {
    name: "Google AI", icon: GoogleIcon, models: [
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Fast, lightweight model', badge: '⚡ Lite' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Enhanced lightweight model', badge: '⚡ Fast' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Balanced speed and capability', badge: '⚡ Flash' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest flash model', badge: '✨ New' },
      { id: 'gemma-3-27b-it', name: 'Gemma 3 27B IT', description: 'High-quality instruction-tuned', badge: '🎯 Pro' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable model', badge: '🚀 Best' },
    ]
  },
  mistral: {
    name: "Mistral AI", icon: MistralIcon, models: [
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast and cost-effective', badge: '💰 Cheap' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced performance', badge: '⚖️ Balanced' },
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most powerful model', badge: '🚀 Power' },
      { id: 'pixtral-large-latest', name: 'Pixtral Large', description: 'Multimodal capabilities', badge: '🖼️ Multi' },
    ]
  },
  zhipu: { 
    name: "ZhipuAI", 
    icon: ZhipuIcon, 
    models: [
      { id: 'glm-4.5-flash', name: 'GLM 4.5 Flash', description: 'Chinese AI model', badge: '🇨🇳 CN' }
    ] 
  },
  groq: {
    name: "Groq", icon: GroqIcon, models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Powerful & versatile', badge: '🦙 OSS' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open-source model', badge: '🔓 120B' },
      { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Medium open-source model', badge: '🔓 20B' },
      { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct (0905)', description: 'Moonshot AI instruction model', badge: '🌙 Kimi' },
      { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', description: 'Moonshot AI latest', badge: '🌙 New' },
    ]
  }
};

const getStatusInfo = (status: BookProject['status']) => {
  const statusMap: Record<BookProject['status'], { text: string; icon: React.ElementType; color: string; animate?: boolean }> = {
    planning: { text: 'Planning', icon: Clock, color: 'text-yellow-400' },
    generating_roadmap: { text: 'Creating Roadmap', icon: Loader2, color: 'text-blue-400', animate: true },
    roadmap_completed: { text: 'Roadmap Ready', icon: CheckCircle, color: 'text-green-400' },
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
    totalWords: books.reduce((sum, b) => sum + (b.totalWords || 0), 0)
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
    <header className="relative flex-shrink-0 w-full h-16 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 border-b border-zinc-800/50 flex items-center px-4 md:px-6 z-30 shadow-xl">
      {/* Logo Section */}
      <div className="flex items-center gap-3 mr-6">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 rounded-lg blur-md opacity-30"></div>
          <img src="/white-logo.png" alt="Pustakam Logo" className="relative w-10 h-10 shadow-lg" />
        </div>
        <div className="hidden md:block">
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Pustakam</h1>
          <p className="text-xs text-gray-500 -mt-1 tracking-wider">AI BOOK ENGINE</p>
        </div>
      </div>

      {/* Center Section - Context Display */}
      <div className="flex-1 flex items-center justify-center px-4 min-w-0">
        {currentBook && currentBookStatusInfo ? (
          <div className="flex items-center gap-4 animate-fade-in">
            {/* Book Title with Status */}
            <div className="flex items-center gap-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700/50">
              <BookOpen size={18} className="text-blue-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-white text-sm truncate block max-w-xs">{currentBook.title}</span>
                <div className={`flex items-center gap-1.5 ${currentBookStatusInfo.color} text-xs mt-0.5`}>
                  <currentBookStatusInfo.icon size={12} className={currentBookStatusInfo.animate ? 'animate-spin' : ''} />
                  <span className="font-medium">{currentBookStatusInfo.text}</span>
                </div>
              </div>
            </div>

            {/* Progress Indicator (if generating) */}
            {['generating_roadmap', 'generating_content', 'assembling'].includes(currentBook.status) && (
              <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-500/20">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Progress</span>
                  <span className="text-sm font-bold text-blue-400">{currentBook.progress || 0}%</span>
                </div>
                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${currentBook.progress || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Stats Display when no book selected
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700/50">
              <BookOpen size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-white">{stats.total}</span>
              <span className="text-xs text-gray-400">Books</span>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-500/20">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm font-medium text-white">{stats.completed}</span>
              <span className="text-xs text-gray-400">Complete</span>
            </div>
            {stats.inProgress > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-blue-500/20">
                <Loader2 size={16} className="text-blue-400 animate-spin" />
                <span className="text-sm font-medium text-white">{stats.inProgress}</span>
                <span className="text-xs text-gray-400">Active</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Model Selector */}
        <div className="relative">
          <button 
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)} 
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-700/50 transition-all hover:border-zinc-600"
          >
            {currentProvider ? <currentProvider.icon /> : <Brain size={20} />}
            <div className="hidden md:flex flex-col items-start min-w-0">
              <span className="text-xs text-gray-400 leading-tight">Model</span>
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">{currentModel?.name || "Select"}</span>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {modelDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto animate-fade-in-up">
              {(Object.entries(modelConfig) as [ModelProvider, any][]).map(([provider, config]) => (
                <div key={provider} className="border-b border-zinc-800 last:border-0">
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <config.icon />
                      <span className="text-sm font-semibold text-white">{config.name}</span>
                    </div>
                    {!hasApiKeyForProvider(provider) && (
                      <div className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
                        <AlertCircle size={12} />
                        <span>No Key</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
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
                          className={`w-full text-left rounded-lg transition-all p-3 mb-1 ${
                            isSelected 
                              ? 'bg-blue-500/20 border border-blue-500/30' 
                              : hasApiKeyForProvider(provider) 
                                ? 'hover:bg-zinc-800/50 border border-transparent' 
                                : 'text-gray-600 cursor-not-allowed opacity-50 border border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                                  {model.name}
                                </span>
                                {model.badge && (
                                  <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">
                                    {model.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{model.description}</p>
                            </div>
                            {isSelected && <Check size={16} className="text-blue-400 mt-1" />}
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

        {/* Library Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setLibraryOpen(!libraryOpen)} 
            className="relative p-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-700/50 transition-all hover:border-zinc-600"
            title="Library"
          >
            <BookOpen size={20} />
            {stats.inProgress > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
            )}
          </button>
          
          {libraryOpen && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 animate-fade-in-up overflow-hidden">
              {/* Library Header with Stats */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-zinc-800 p-4">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <BookOpen size={18} />
                  Your Library
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-green-400">{stats.completed}</div>
                    <div className="text-xs text-gray-400">Done</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-blue-400">{Math.round(stats.totalWords / 1000)}k</div>
                    <div className="text-xs text-gray-400">Words</div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-zinc-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your books..."
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Books List */}
              <div className="max-h-80 overflow-y-auto p-2">
                {sortedBooks.map(book => {
                  const statusInfo = getStatusInfo(book.status);
                  const isActive = currentBook?.id === book.id;
                  const completedModules = book.modules?.filter(m => m.status === 'completed').length || 0;
                  const totalModules = book.modules?.length || 0;
                  
                  return (
                    <div
                      key={book.id}
                      onClick={() => {
                        onSelectBook(book.id);
                        setLibraryOpen(false);
                      }}
                      className={`group relative rounded-lg cursor-pointer p-3 mb-2 transition-all ${
                        isActive 
                          ? 'bg-blue-500/20 border border-blue-500/30 shadow-lg' 
                          : 'bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-semibold truncate mb-1 ${
                            isActive ? 'text-blue-300' : 'text-white'
                          }`}>
                            {book.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                              <statusInfo.icon size={12} className={statusInfo.animate ? 'animate-spin' : ''} />
                              <span>{statusInfo.text}</span>
                            </div>
                            {totalModules > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <span>•</span>
                                <span>{completedModules}/{totalModules} modules</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar size={10} />
                            <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this book?')) {
                              onDeleteBook(book.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {books.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen size={48} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500">No books yet</p>
                    <p className="text-xs text-gray-600 mt-1">Create your first book to get started</p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="border-t border-zinc-800 p-2 bg-zinc-900/50">
                <button
                  onClick={() => {
                    onNewBook();
                    setLibraryOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all mb-2"
                >
                  <Plus size={16} />
                  Create New Book
                </button>
                <button
                  onClick={() => {
                    onOpenSettings();
                    setLibraryOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-gray-300 rounded-lg transition-all"
                >
                  <Settings size={16} />
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for dropdowns */}
      {(modelDropdownOpen || libraryOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" 
          onClick={() => {
            setModelDropdownOpen(false);
            setLibraryOpen(false);
          }}
        />
      )}
    </header>
  );
}
