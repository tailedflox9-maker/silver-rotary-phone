import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { useGenerationStats } from './components/GenerationProgressPanel';
import { APISettings, ModelProvider } from './types';
import { usePWA } from './hooks/usePWA';
import { WifiOff } from 'lucide-react';
import { storageUtils } from './utils/storage';
import { bookService } from './services/bookService';
import { BookProject, BookSession } from './types/book';
import { generateId } from './utils/helpers';
import { TopHeader } from './components/TopHeader';

// --- Error Boundary (Fix 7) ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)] p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type AppView = 'list' | 'create' | 'detail';
type Theme = 'light' | 'dark';

interface GenerationStatus {
  currentModule?: { id: string; title: string; attempt: number; progress: number; generatedText?: string; };
  totalProgress: number;
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused' | 'waiting_retry';
  logMessage?: string;
  totalWordsGenerated?: number;
  retryInfo?: { moduleTitle: string; error: string; retryCount: number; maxRetries: number; waitTime?: number; };
}

function App() {
  const [books, setBooks] = useState<BookProject[]>(() => storageUtils.getBooks());
  const [settings, setSettings] = useState<APISettings>(() => storageUtils.getSettings());
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('list');
  const [showListInMain, setShowListInMain] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({ status: 'idle', totalProgress: 0, totalWordsGenerated: 0 });
  const [generationStartTime, setGenerationStartTime] = useState<Date>(new Date());
  const [showModelSwitch, setShowModelSwitch] = useState(false);
  const [modelSwitchOptions, setModelSwitchOptions] = useState<Array<{provider: ModelProvider; model: string; name: string}>>([]);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('pustakam-theme') as Theme) || 'dark');

  const { isInstallable, isInstalled, installApp, dismissInstallPrompt } = usePWA();
  
  const currentBook = useMemo(() => currentBookId ? books.find(b => b.id === currentBookId) : null, [currentBookId, books]);
  
  const isGenerating = useMemo(() => {
    if (!currentBook) return false;
    return currentBook.status === 'generating_content' || generationStatus.status === 'generating';
  }, [currentBook?.status, generationStatus.status]);

  const totalWordsGenerated = currentBook?.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0) || 0;

  const generationStats = useGenerationStats(
    currentBook?.roadmap?.totalModules || 0,
    currentBook?.modules.filter(m => m.status === 'completed').length || 0,
    currentBook?.modules.filter(m => m.status === 'error').length || 0,
    generationStartTime,
    generationStatus.totalWordsGenerated || totalWordsGenerated
  );
  
  useEffect(() => {
    localStorage.setItem('pustakam-theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    books.forEach(book => {
      if (book.status === 'completed') {
        try { localStorage.removeItem(`pause_flag_${book.id}`); } 
        catch (e) { console.warn('Failed to clear pause flag:', e); }
      }
    });
  }, []);

  // ✅ FIX 1: Infinite Loop Risk
  const hasTriggeredCompletion = useRef(false);

  useEffect(() => {
    if (!currentBook || hasTriggeredCompletion.current) return;
    
    const areAllModulesDone = 
      currentBook.roadmap &&
      currentBook.modules.length === currentBook.roadmap.modules.length &&
      currentBook.modules.every(m => m.status === 'completed');
    
    if (areAllModulesDone && 
        currentBook.status === 'generating_content' && 
        generationStatus.status !== 'generating' &&
        generationStatus.status !== 'paused' &&
        generationStatus.status !== 'waiting_retry') {
      
      console.log('✓ All modules completed - updating to roadmap_completed');
      
      hasTriggeredCompletion.current = true; // Set flag
      
      setBooks(prevBooks => 
        prevBooks.map(book =>
          book.id === currentBook.id
            ? { ...book, status: 'roadmap_completed', progress: 90, updatedAt: new Date() }
            : book
        )
      );
      
      setGenerationStatus({
        status: 'completed',
        totalProgress: 100,
        logMessage: '✅ All modules completed!',
        totalWordsGenerated: currentBook.modules.reduce((s, m) => s + m.wordCount, 0)
      });
    }
  }, [currentBook, generationStatus.status]); // Dependency array is correct

  // Reset flag when book changes
  useEffect(() => {
    hasTriggeredCompletion.current = false;
  }, [currentBookId]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const hasApiKey = !!(settings.googleApiKey || settings.mistralApiKey || settings.zhipuApiKey || settings.groqApiKey);
  
  const getAlternativeModels = () => {
    const alternatives: Array<{provider: ModelProvider; model: string; name: string}> = [];
    if (settings.googleApiKey && settings.selectedProvider !== 'google') alternatives.push({ provider: 'google', model: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' });
    if (settings.mistralApiKey && settings.selectedProvider !== 'mistral') alternatives.push({ provider: 'mistral', model: 'mistral-small-latest', name: 'Mistral Small' });
    if (settings.zhipuApiKey && settings.selectedProvider !== 'zhipu') alternatives.push({ provider: 'zhipu', model: 'glm-4.5-flash', name: 'GLM 4.5 Flash' });
    if (settings.groqApiKey && settings.selectedProvider !== 'groq') alternatives.push({ provider: 'groq', model: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B' });
    return alternatives;
  };

  const showModelSwitchModal = (alternatives: any) => { setModelSwitchOptions(alternatives); setShowModelSwitch(true); };
  
  const handleModelSwitch = async (provider: ModelProvider, model: string) => {
    const newSettings = { ...settings, selectedProvider: provider, selectedModel: model };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings); // Fix 5: Ensure settings are saved properly
    setShowModelSwitch(false);
    setTimeout(() => {
      if (currentBook) {
        const modelName = modelSwitchOptions.find(m => m.provider === provider)?.name;
        alert(`✅ Switched to ${modelName}\n\nClick Resume to continue.`);
        setGenerationStatus(prev => ({ ...prev, status: 'paused', logMessage: '⚙️ Model switched' }));
      }
    }, 100);
  };

  const handleRetryDecision = async (decision: 'retry' | 'switch' | 'skip') => {
    if (!currentBook) return;
    if (decision === 'retry') { 
      bookService.setRetryDecision(currentBook.id, 'retry'); 
    }
    else if (decision === 'switch') {
      bookService.setRetryDecision(currentBook.id, 'switch');
      const alternatives = getAlternativeModels();
      if (alternatives.length === 0) { 
        alert('No alternative models available. Please configure API keys in Settings.'); 
        setSettingsOpen(true); 
        return; 
      }
      showModelSwitchModal(alternatives);
    } 
    else if (decision === 'skip') {
      if (window.confirm('⚠️ Skip this module? It will be marked as failed.')) {
        bookService.setRetryDecision(currentBook.id, 'skip');
      }
    }
  };

  const handleSelectBook = (id: string | null) => {
    setCurrentBookId(id);
    if (id) {
      setView('detail');
      const book = books.find(b => b.id === id);
      if (book?.status === 'completed') {
        try { localStorage.removeItem(`pause_flag_${id}`); } catch (e) { console.warn(e); } // Fix 5: LocalStorage error handling
        setGenerationStatus({ status: 'idle', totalProgress: 0, totalWordsGenerated: book.modules.reduce((s, m) => s + m.wordCount, 0) });
      }
    }
  };
  
  const handleUpdateBookStatus = (bookId: string, newStatus: BookProject['status']) => {
    if (!bookId || !newStatus) return;
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId
          ? { ...book, status: newStatus, updatedAt: new Date() }
          : book
      )
    );
  };

  const handleCreateBookRoadmap = async (session: BookSession) => {
    if (!session.goal.trim()) { alert('Please enter a learning goal'); return; }
    if (!hasApiKey) { alert('Please configure an API key in Settings first'); setSettingsOpen(true); return; }

    const bookId = generateId();
    
    try {
      localStorage.removeItem(`pause_flag_${bookId}`); // Fix 5: LocalStorage error handling
      localStorage.removeItem(`checkpoint_${bookId}`); // Fix 5: LocalStorage error handling
    } catch (e) {
      console.warn('Failed to clear flags:', e);
    }

    const newBook: BookProject = {
      id: bookId, 
      title: session.goal.length > 100 ? session.goal.substring(0, 100) + '...' : session.goal,
      goal: session.goal, 
      language: 'en', 
      status: 'planning', 
      progress: 0, 
      createdAt: new Date(), 
      updatedAt: new Date(),
      modules: [], 
      category: 'general', 
      reasoning: session.reasoning
    };

    setBooks(prev => {
        try { // Fix 5: LocalStorage error handling for saveBooks
            const updatedBooks = [...prev, newBook];
            storageUtils.saveBooks(updatedBooks);
            return updatedBooks;
        } catch (error) {
            console.error('Failed to add new book to storage:', error);
            alert('Could not save new book due to storage issues. Please export data and clear old data in settings.');
            return prev;
        }
    });
    setCurrentBookId(bookId);
    setView('detail');

    try {
      const roadmap = await bookService.generateRoadmap(session, bookId);
      setBooks(prev => prev.map(book => 
        book.id === bookId 
          ? { 
              ...book, 
              roadmap, 
              status: 'roadmap_completed', 
              progress: 10, 
              title: roadmap.modules[0]?.title.includes('Module') 
                ? session.goal 
                : roadmap.modules[0]?.title || session.goal 
            }
          : book
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate roadmap';
      setBooks(prev => prev.map(book => 
        book.id === bookId 
          ? { ...book, status: 'error', error: errorMessage } 
          : book
      ));
      alert(`Failed to generate roadmap: ${errorMessage}\n\nPlease check your API key and internet connection.`);
    }
  };
  
  const handleGenerateAllModules = async (book: BookProject, session: BookSession) => {
    if (!book.roadmap) { alert('No roadmap available.'); return; }
    setGenerationStartTime(new Date());
    setGenerationStatus({ status: 'generating', totalProgress: 0, logMessage: 'Starting generation...', totalWordsGenerated: 0 });
    try {
      await bookService.generateAllModulesWithRecovery(book, session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Module generation failed';
      if (!errorMessage.includes('GENERATION_PAUSED')) {
        setGenerationStatus({ status: 'error', totalProgress: 0, logMessage: `Generation failed: ${errorMessage}` });
        alert(`Generation failed: ${errorMessage}`);
      }
    }
  };

  const handlePauseGeneration = (bookId: string) => {
    bookService.pauseGeneration(bookId);
    setGenerationStatus(prev => ({ ...prev, status: 'paused', logMessage: '⏸ Generation paused' }));
  };

  const handleResumeGeneration = async (book: BookProject, session: BookSession) => {
    if (!book.roadmap) { alert('No roadmap available'); return; }
    bookService.resumeGeneration(book.id);
    setGenerationStartTime(new Date());
    setGenerationStatus({
      status: 'generating', totalProgress: 0, logMessage: 'Resuming generation...',
      totalWordsGenerated: book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0)
    });
    try {
      await bookService.generateAllModulesWithRecovery(book, session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Resume failed';
      if (!errorMessage.includes('GENERATION_PAUSED')) {
        setGenerationStatus({ status: 'error', totalProgress: 0, logMessage: `Resume failed: ${errorMessage}`});
      }
    }
  };

  const handleRetryFailedModules = async (book: BookProject, session: BookSession) => {
    const failedModules = book.modules.filter(m => m.status === 'error');
    if (failedModules.length === 0) { alert('No failed modules to retry'); return; }
    setGenerationStartTime(new Date());
    setGenerationStatus({
      status: 'generating', totalProgress: 0, logMessage: `Retrying ${failedModules.length} failed modules...`,
      totalWordsGenerated: book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0)
    });
    try {
      await bookService.retryFailedModules(book, session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      setGenerationStatus({ status: 'error', totalProgress: 0, logMessage: `Retry failed: ${errorMessage}` });
    }
  };

  const handleAssembleBook = async (book: BookProject, session: BookSession) => {
    try {
      await bookService.assembleFinalBook(book, session);
      setGenerationStatus({ status: 'completed', totalProgress: 100, logMessage: '✅ Book completed!' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Assembly failed';
      alert(`Failed to assemble book: ${errorMessage}`);
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: 'error', error: errorMessage } : b));
    }
  };

  const handleDeleteBook = (id: string) => {
    if (window.confirm('Delete this book permanently? This cannot be undone.')) {
      setBooks(prev => {
          const updatedBooks = prev.filter(b => b.id !== id);
          try { // Fix 5: LocalStorage error handling for saveBooks
            storageUtils.saveBooks(updatedBooks);
          } catch (error) {
            console.error('Failed to delete book from storage:', error);
            alert('Could not delete book from storage. Please manually clear data in settings if issue persists.');
          }
          return updatedBooks;
      });
      if (currentBookId === id) {
        setCurrentBookId(null);
        setView('list');
      }
      try { // Fix 5: LocalStorage error handling
        localStorage.removeItem(`checkpoint_${id}`);
        localStorage.removeItem(`pause_flag_${id}`);
      } catch (e) { console.warn('Failed to clear storage:', e); }
      bookService.clearCurrentGeneratedText(id); // Fix 2: Clear cached generated text for deleted book
    }
  };
  
  const handleSaveSettings = (newSettings: APISettings) => {
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings); // Fix 5: Ensure settings are saved properly
    setSettingsOpen(false);
  };
  
  const handleModelChange = (model: string, provider: ModelProvider) => {
    const newSettings = { ...settings, selectedModel: model, selectedProvider: provider };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings); // Fix 5: Ensure settings are saved properly
  };

  const handleInstallApp = async () => { await installApp(); };
  
  const handleUpdateBookContent = (bookId: string, newContent: string) => {
    setBooks(prev => prev.map(book => 
      book.id === bookId 
        ? { ...book, finalBook: newContent, updatedAt: new Date() }
        : book
    ));
  };

  // ✅ FIX 3: useCallback for handleBookProgressUpdate
  const handleBookProgressUpdate = useCallback((bookId: string, updates: Partial<BookProject>) => {
    setBooks(prev => prev.map(book => book.id === bookId ? { ...book, ...updates, updatedAt: new Date() } : book));
  }, []);

  useEffect(() => {
    bookService.updateSettings(settings);
    bookService.setProgressCallback(handleBookProgressUpdate);
    bookService.setGenerationStatusCallback((bookId, status) => {
      setGenerationStatus(prev => ({ ...prev, ...status, totalWordsGenerated: status.totalWordsGenerated || prev.totalWordsGenerated }));
    });
  }, [settings, handleBookProgressUpdate]); // ✅ FIX 3: Added handleBookProgressUpdate to dependency array

  useEffect(() => { storageUtils.saveBooks(books); }, [books]);
  
  useEffect(() => { if (!currentBookId) setView('list'); }, [currentBookId]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setShowOfflineMessage(false); };
    const handleOffline = () => { setIsOnline(false); setShowOfflineMessage(true); setTimeout(() => setShowOfflineMessage(false), 5000); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);


  return (
    <div className="app-container">
      {theme === 'dark' ? (
        <div className="starfield-background">
          <div className="starfield-layer1" />
          <div className="starfield-layer2" />
        </div>
      ) : (
        <div className="sun-background" />
      )}

      <TopHeader
        settings={settings}
        books={books}
        currentBookId={currentBookId}
        onModelChange={handleModelChange}
        onOpenSettings={() => setSettingsOpen(true)}
        onSelectBook={handleSelectBook}
        onDeleteBook={handleDeleteBook}
        onNewBook={() => {
          setView('create');
          setCurrentBookId(null);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main id="main-scroll-area" className="main-content">
        {showOfflineMessage && (
          <div className="fixed top-20 right-4 z-50 content-card p-3 animate-fade-in-up">
            <div className="flex items-center gap-2 text-yellow-400">
              <WifiOff size={16} /> 
              <span className="text-sm">You're offline. Some features may be unavailable.</span>
            </div>
          </div>
        )}

        <BookView
          books={books}
          currentBookId={currentBookId}
          onCreateBookRoadmap={handleCreateBookRoadmap}
          onGenerateAllModules={handleGenerateAllModules}
          onRetryFailedModules={handleRetryFailedModules}
          onAssembleBook={handleAssembleBook}
          onSelectBook={handleSelectBook}
          onDeleteBook={handleDeleteBook}
          onUpdateBookStatus={handleUpdateBookStatus}
          hasApiKey={hasApiKey}
          view={view}
          setView={setView}
          onUpdateBookContent={handleUpdateBookContent}
          showListInMain={showListInMain}
          setShowListInMain={setShowListInMain}
          isMobile={isMobile}
          generationStatus={generationStatus}
          generationStats={generationStats}
          onPauseGeneration={handlePauseGeneration}
          onResumeGeneration={handleResumeGeneration}
          isGenerating={isGenerating}
          onRetryDecision={handleRetryDecision}
          availableModels={getAlternativeModels()}
          theme={theme}
        />
      </main>

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        settings={settings} 
        onSaveSettings={handleSaveSettings} 
      />
      
      {showModelSwitch && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4">Switch AI Model</h3>
            <p className="text-sm text-gray-400 mb-6">Select an alternative model to continue generation:</p>
            <div className="space-y-3 mb-6">
              {modelSwitchOptions.map((option) => (
                <button
                  key={`${option.provider}-${option.model}`}
                  onClick={() => handleModelSwitch(option.provider, option.model)}
                  className="w-full p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg hover:border-blue-500 transition-all text-left"
                >
                  <div className="font-semibold text-[var(--color-text-primary)]">{option.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{option.provider} • {option.model}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowModelSwitch(false)} className="w-full btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}
      
      {isInstallable && !isInstalled && (
        <InstallPrompt onInstall={handleInstallApp} onDismiss={dismissInstallPrompt} />
      )}
      
      <Analytics />
    </div>
  );
}

// ✅ FIX 7: Export App wrapped in Error Boundary
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
