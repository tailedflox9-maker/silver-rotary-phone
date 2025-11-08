// src/components/BookView.tsx
import React, { useEffect, ReactNode, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Book,
  Plus,
  Download,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Target,
  Users,
  Brain,
  Sparkles,
  BarChart3,
  ListChecks,
  Play,
  Box,
  ArrowLeft,
  Check,
  BookText,
  RefreshCw,
  Edit,
  Save,
  X,
  FileText,
  Maximize2,
  Minimize2,
  List,
  Settings,
  Moon,
  ZoomIn,
  ZoomOut,
  BookOpen,
  ChevronUp,
  RotateCcw,
  Palette,
  Hash,
  Activity,
  TrendingUp,
  Zap,
  Gauge,
  Terminal,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Pause,
  AlertTriangle,
  ChevronDown,
  Sun
} from 'lucide-react';
import { BookProject, BookSession } from '../types/book';
import { bookService } from '../services/bookService';
import { BookAnalytics } from './BookAnalytics';
import { CustomSelect } from './CustomSelect';
import { pdfService } from '../services/pdfService';
import { readingProgressUtils } from '../utils/readingProgress';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type AppView = 'list' | 'create' | 'detail';
interface GenerationStatus {
  currentModule?: {
    id: string;
    title: string;
    attempt: number;
    progress: number;
    generatedText?: string;
  };
  totalProgress: number;
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused' | 'waiting_retry';
  logMessage?: string;
  totalWordsGenerated?: number;
  aiStage?: 'analyzing' | 'writing' | 'examples' | 'polishing' | 'complete';
  retryInfo?: {
    moduleTitle: string;
    error: string;
    retryCount: number;
    maxRetries: number;
    waitTime?: number;
  };
}
interface GenerationStats {
  startTime: Date;
  totalModules: number;
  completedModules: number;
  failedModules: number;
  averageTimePerModule: number;
  estimatedTimeRemaining: number;
  totalWordsGenerated: number;
  wordsPerMinute: number;
}
interface BookViewProps {
  books: BookProject[];
  currentBookId: string | null;
  onCreateBookRoadmap: (session: BookSession) => Promise<void>;
  onGenerateAllModules: (book: BookProject, session: BookSession) => Promise<void>;
  onRetryFailedModules: (book: BookProject, session: BookSession) => Promise<void>;
  onAssembleBook: (book: BookProject, session: BookSession) => Promise<void>;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  hasApiKey: boolean;
  view: AppView;
  setView: React.Dispatch<React.SetStateAction<AppView>>;
  onUpdateBookContent: (bookId: string, newContent: string) => void;
  showListInMain: boolean;
  setShowListInMain: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile?: boolean;
  generationStatus?: GenerationStatus;
  generationStats?: GenerationStats;
  onPauseGeneration?: (bookId: string) => void;
  onResumeGeneration?: (book: BookProject, session: BookSession) => void;
  isGenerating?: boolean;
  onRetryDecision?: (decision: 'retry' | 'switch' | 'skip') => void;
  availableModels?: Array<{provider: string; model: string; name: string}>;
  theme: 'light' | 'dark';
}
interface ReadingModeProps {
  content: string;
  isEditing: boolean;
  editedContent: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onContentChange: (content: string) => void;
}
interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans' | 'mono';
  theme: 'dark' | 'sepia' | 'light';
  maxWidth: 'narrow' | 'medium' | 'wide';
  textAlign: 'left' | 'justify';
}

// ============================================================================
// CONSTANTS
// ============================================================================
const THEMES = {
  dark: {
    bg: '#0F0F0F',
    contentBg: '#1A1A1A',
    text: '#E5E5E5',
    secondary: '#A0A0A0',
    border: '#333333',
    accent: '#6B7280',
  },
  sepia: {
    bg: '#F5F1E8',
    contentBg: '#FAF7F0',
    text: '#3C2A1E',
    secondary: '#8B7355',
    border: '#D4C4A8',
    accent: '#B45309',
  },
  light: {
    bg: '#FFFFFF',
    contentBg: '#F9F9F9',
    text: '#1A1A1A',
    secondary: '#555555',
    border: '#E0E0E0',
    accent: '#3B82F6',
  },
};
const FONT_FAMILIES = {
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", monospace',
};
const MAX_WIDTHS = {
  narrow: '65ch',
  medium: '75ch',
  wide: '85ch',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 1) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

// ============================================================================
// SUB-COMPONENTS (UNCHANGED)
// ============================================================================
const GradientProgressBar = ({ progress = 0, active = true }) => (
  <div className="relative w-full h-2.5 bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-700/50">
    <div
      className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 transition-all duration-700 ease-out"
      style={{
        width: `${progress}%`,
        backgroundSize: '200% 100%',
        animation: active ? 'gradient-flow 3s ease infinite' : 'none',
      }}
    />
  </div>
);

const PixelAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pixels, setPixels] = useState<any[]>([]);

  useEffect(() => {
    const colors = [
      'bg-orange-500', 'bg-yellow-500', 'bg-amber-600',
      'bg-red-500', 'bg-zinc-700', 'bg-zinc-600',
    ];

    const generatePixels = () => {
      if (containerRef.current) {
        const pixelSpace = 12; 
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;

        const numCols = Math.floor(containerWidth / pixelSpace);
        const numRows = Math.floor(containerHeight / pixelSpace);
        const totalPixels = numCols * numRows;

        if (totalPixels > 0) {
          const newPixels = Array(totalPixels)
            .fill(0)
            .map((_, i) => ({
              id: i,
              color: colors[Math.floor(Math.random() * colors.length)],
              opacity: Math.random() > 0.5 ? 'opacity-100' : 'opacity-30',
            }));
          setPixels(newPixels);
        }
      }
    };

    const observer = new ResizeObserver(() => {
      generatePixels();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    const interval = setInterval(generatePixels, 250);

    return () => {
      clearInterval(interval);
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-wrap content-start gap-1.5 w-full h-10 md:h-4 overflow-hidden">
      {pixels.map((p) => (
        <div
          key={p.id}
          className={`w-1.5 h-1.5 rounded-sm ${p.color} ${p.opacity} transition-opacity duration-200`}
        />
      ))}
    </div>
  );
};


const RetryDecisionPanel = ({
  retryInfo,
  onRetry,
  onSwitchModel,
  onSkip,
  availableModels,
}: {
  retryInfo: {
    moduleTitle: string;
    error: string;
    retryCount: number;
    maxRetries: number;
    waitTime?: number;
  };
  onRetry: () => void;
  onSwitchModel: () => void;
  onSkip: () => void;
  availableModels: Array<{provider: string; model: string; name: string}>;
}) => {
  const [countdown, setCountdown] = useState(Math.ceil((retryInfo.waitTime || 0) / 1000));

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);
  const isRateLimit = retryInfo.error.toLowerCase().includes('rate limit') ||
                      retryInfo.error.toLowerCase().includes('429');

  const isNetworkError = retryInfo.error.toLowerCase().includes('network') ||
                         retryInfo.error.toLowerCase().includes('connection');
  return (
    <div className="bg-red-900/20 backdrop-blur-xl border border-red-500/50 rounded-xl overflow-hidden animate-fade-in-up">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-lg border border-red-500/30">
              <AlertCircle className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Generation Failed</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Attempt {retryInfo.retryCount} of {retryInfo.maxRetries}
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full text-xs font-semibold text-red-300">
            Waiting
          </div>
        </div>
        <div className="mb-4 p-4 bg-black/40 border border-white/10 rounded-lg">
          <h4 className="font-medium text-white mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            {retryInfo.moduleTitle}
          </h4>
          <div className="text-sm text-gray-300 mb-3">
            <span className="text-red-400 font-medium">Error:</span> {retryInfo.error}
          </div>
          <div className="flex items-center gap-2">
            {isRateLimit && (
              <div className="flex items-center gap-1.5 text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-md border border-yellow-500/20">
                <Clock className="w-3 h-3" />
                Rate Limit - Wait recommended
              </div>
            )}
            {isNetworkError && (
              <div className="flex items-center gap-1.5 text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md border border-orange-500/20">
                <AlertTriangle className="w-3 h-3" />
                Network Issue
              </div>
            )}
          </div>
        </div>
        <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-white mb-2">Recommended Actions:</p>
              <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                {isRateLimit && (
                  <>
                    <li>✓ Wait {countdown > 0 ? `${countdown}s` : 'a moment'} and retry with same model</li>
                    <li>✓ Or switch to a different AI model immediately</li>
                  </>
                )}
                {isNetworkError && (
                  <>
                    <li>✓ Check your internet connection</li>
                    <li>✓ Retry in a few seconds</li>
                  </>
                )}
                {!isRateLimit && !isNetworkError && (
                  <>
                    <li>✓ Try a different AI model</li>
                    <li>✓ Or retry after a short wait</li>
                  </>
                )}
                <li>⚠️ Skipping will mark this module as failed</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={onRetry}
            disabled={countdown > 0}
            className="w-full btn bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-white font-semibold py-3 transition-all shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {countdown > 0 ? `Retry in ${countdown}s` : 'Retry Same Model'}
          </button>
          {availableModels.length > 0 && (
            <button
              onClick={onSwitchModel}
              className="w-full btn bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold py-3 transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Switch AI Model ({availableModels.length} available)
            </button>
          )}
          <button
            onClick={onSkip}
            className="w-full btn border border-zinc-700 hover:bg-zinc-800 rounded-lg text-gray-300 font-medium py-3 transition-all hover:border-red-500/50 hover:text-red-400 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Skip This Module
          </button>
        </div>
        <div className="mt-4 text-xs text-zinc-500 flex items-center gap-1.5 justify-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Your progress has been saved. You can also close this tab.</span>
        </div>
      </div>
    </div>
  );
};

const EmbeddedProgressPanel = ({
  generationStatus,
  stats,
  onCancel,
  onPause,
  onResume,
  onRetryDecision,
  availableModels,
}: {
  generationStatus: GenerationStatus;
  stats: GenerationStats;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetryDecision?: (decision: 'retry' | 'switch' | 'skip') => void;
  availableModels?: Array<{provider: string; model: string; name: string}>;
}) => {
  const streamBoxRef = useRef<HTMLDivElement>(null);

  const isPaused = generationStatus.status === 'paused';
  const isGenerating = generationStatus.status === 'generating';
  const isWaitingRetry = generationStatus.status === 'waiting_retry';
  useEffect(() => {
    if (streamBoxRef.current && generationStatus.currentModule?.generatedText) {
      streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
    }
  }, [generationStatus.currentModule?.generatedText]);
  const overallProgress = (stats.completedModules / (stats.totalModules || 1)) * 100;
  if (isWaitingRetry && generationStatus.retryInfo && onRetryDecision) {
    return (
      <RetryDecisionPanel
        retryInfo={generationStatus.retryInfo}
        onRetry={() => onRetryDecision('retry')}
        onSwitchModel={() => onRetryDecision('switch')}
        onSkip={() => onRetryDecision('skip')}
        availableModels={availableModels || []}
      />
    );
  }
  return (
    <div className={`bg-zinc-900/60 backdrop-blur-xl border rounded-xl overflow-hidden animate-fade-in-up ${
      isPaused ? 'border-yellow-500/50' : 'border-zinc-800/50'
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isPaused ? (
              <div className="w-12 h-12 flex items-center justify-center bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <Pause className="w-6 h-6 text-yellow-400" />
              </div>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isPaused ? 'Generation Paused' : 'Generating Chapters...'}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {stats.completedModules} of {stats.totalModules} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 border rounded-full text-xs font-semibold ${
              isPaused
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
            }`}>
              {Math.round(overallProgress)}%
            </div>
            <div className="text-sm font-mono text-zinc-400">
              {stats.totalWordsGenerated.toLocaleString()} words
            </div>
          </div>
        </div>
        <div className="mb-4">
          <GradientProgressBar
            progress={overallProgress}
            active={isGenerating}
          />
        </div>
        {isPaused && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Pause className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-300 mb-1">
                  Generation Paused
                </p>
                <p className="text-xs text-yellow-400/80">
                  Your progress is saved. You can resume anytime or close this tab safely.
                </p>
              </div>
            </div>
          </div>
        )}
        {isGenerating && generationStatus.currentModule && (
          <>
            <div className="mt-5 mb-4">
              <PixelAnimation />
            </div>
            {generationStatus.currentModule.generatedText && (
              <div className="bg-black/40 border border-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    {generationStatus.currentModule.title}
                  </h4>
                  {generationStatus.currentModule.attempt > 1 && (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                      <RefreshCw className="w-3 h-3" />
                      <span>Attempt {generationStatus.currentModule.attempt}</span>
                    </div>
                  )}
                </div>
                <div
                  ref={streamBoxRef}
                  className="text-sm text-zinc-300 leading-relaxed max-h-32 overflow-y-auto font-mono streaming-text-box"
                >
                  {generationStatus.currentModule.generatedText}
                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
                </div>
              </div>
            )}
          </>
        )}
        <div className="mt-6 pt-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span>
                {isPaused
                  ? `Paused • ${stats.completedModules}/${stats.totalModules} done`
                  : `${formatTime(stats.estimatedTimeRemaining)} remaining`
                }
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(isGenerating || isPaused) && onCancel && (
                <button onClick={onCancel} className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-all hover:border-red-500/50 hover:text-red-400" title="Stop generation and save progress" >
                  <X className="w-4 h-4 inline mr-1.5" /> Cancel
                </button>
              )}
              {isPaused ? (
                onResume && (
                  <button onClick={onResume} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-all shadow-lg hover:shadow-green-500/30 flex items-center gap-2" title="Resume generation from where you left off" >
                    <Play className="w-4 h-4" /> Resume Generation
                  </button>
                )
              ) : isGenerating && onPause && (
                <button onClick={onPause} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-semibold transition-all shadow-lg hover:shadow-yellow-500/30 flex items-center gap-2" title="Pause and save progress" >
                  <Pause className="w-4 h-4" /> Pause
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>
              {isPaused
                ? 'Progress is saved. You can close this tab safely.'
                : 'You can pause anytime. Progress will be saved automatically.'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CodeBlock = React.memo(({ children, language, theme }: any) => (
  <SyntaxHighlighter
    style={vscDarkPlus}
    language={language}
    PreTag="div"
    className={`!rounded-xl !my-6 !text-sm border ${
      theme === 'dark'
        ? '!bg-[#0D1117] border-gray-700'
        : theme === 'sepia'
        ? '!bg-[#F0EAD6] border-[#D4C4A8] !text-gray-800'
        : '!bg-[#f8f8f8] border-gray-200 !text-gray-800'
    }`}
    customStyle={{
      padding: '1.5rem',
      fontSize: '0.875rem',
      lineHeight: '1.5',
    }}
  >
    {String(children).replace(/\n$/, '')}
  </SyntaxHighlighter>
));

const ReadingMode: React.FC<ReadingModeProps & { bookId: string; currentModuleIndex: number }> = ({
  content,
  isEditing,
  editedContent,
  onEdit,
  onSave,
  onCancel,
  onContentChange,
  bookId,
  currentModuleIndex
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('pustakam-reading-settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      fontSize: 18,
      lineHeight: 1.7,
      fontFamily: 'serif',
      theme: 'dark',
      maxWidth: 'medium',
      textAlign: 'left',
      ...parsed,
    };
  });

  // Auto-save bookmark on scroll
  useEffect(() => {
    if (!contentRef.current || isEditing) return;

    const handleScroll = () => {
      if (contentRef.current) {
        const scrollPosition = contentRef.current.scrollTop;
        readingProgressUtils.saveBookmark(bookId, currentModuleIndex, scrollPosition);
      }
    };

    const scrollContainer = contentRef.current;
    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [bookId, currentModuleIndex, isEditing]);

  // Restore scroll position on load
  useEffect(() => {
    if (contentRef.current && !isEditing) {
      const bookmark = readingProgressUtils.getBookmark(bookId);
      if (bookmark && bookmark.moduleIndex === currentModuleIndex) {
        contentRef.current.scrollTop = bookmark.scrollPosition;
      }
    }
  }, [bookId, currentModuleIndex, isEditing]);

  useEffect(() => {
    localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings));
  }, [settings]);

  const currentTheme = THEMES[settings.theme];

  if (isEditing) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--color-bg)] z-30 pt-4 pb-2 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editing Mode
          </h3>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn btn-secondary">
              <X size={16} /> Cancel
            </button>
            <button onClick={onSave} className="btn btn-primary">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
        <textarea
          className="w-full h-[70vh] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-white font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          value={editedContent}
          onChange={(e) => onContentChange(e.target.value)}
          style={{ fontSize: `${settings.fontSize - 2}px` }}
        />
      </div>
    );
  }
  
  const readingAreaStyles = {
    backgroundColor: currentTheme.bg,
    color: currentTheme.text,
  };
  
  const contentStyles = {
    fontFamily: FONT_FAMILIES[settings.fontFamily],
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    maxWidth: MAX_WIDTHS[settings.maxWidth],
    textAlign: settings.textAlign as any,
    color: currentTheme.text,
  };

  return (
    <div
      className={`reading-container theme-${settings.theme} rounded-lg border border-[var(--color-border)] overflow-hidden transition-colors duration-300`}
      style={readingAreaStyles}
    >
      {/* Control Bar */}
      <div className="flex justify-between items-center gap-3 p-3 border-b" style={{ borderColor: currentTheme.border }}>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: currentTheme.contentBg }}>
          {(['light', 'sepia', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => setSettings(prev => ({ ...prev, theme }))}
              className={`p-2 rounded-md transition-all`}
              style={{
                backgroundColor: settings.theme === theme ? currentTheme.accent : 'transparent',
                color: settings.theme === theme ? '#FFFFFF' : currentTheme.secondary,
              }}
              title={`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`}
            >
              {theme === 'light' ? <Sun size={16} /> : theme === 'sepia' ? <Palette size={16} /> : <Moon size={16} />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
            <button
              onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 1) }))}
              className="p-2 rounded-lg transition-colors hover:bg-black/5" style={{ color: currentTheme.secondary }}
            >
              <ZoomOut size={16} />
            </button>
            <span className="min-w-[3rem] text-center text-sm font-mono" style={{ color: currentTheme.secondary }}>{settings.fontSize}px</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.min(28, prev.fontSize + 1) }))}
              className="p-2 rounded-lg transition-colors hover:bg-black/5" style={{ color: currentTheme.secondary }}
            >
              <ZoomIn size={16} />
            </button>
        </div>
        
        <button onClick={onEdit} className="btn btn-secondary btn-sm" style={{borderColor: currentTheme.border, color: currentTheme.secondary}}>
          <Edit size={14} /> Edit
        </button>
      </div>
      
      {/* Content Area */}
      <div ref={contentRef} className="p-4 sm:p-8">
        <article
          className={`prose prose-lg max-w-none transition-all duration-300 ${
            settings.theme === 'dark' || settings.theme === 'sepia' ? 'prose-invert' : ''
          }`}
          style={contentStyles}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: (props) => <CodeBlock {...props} theme={settings.theme} />,
            }}
            className="focus:outline-none"
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
};


// ============================================================================
// REDESIGNED SUB-COMPONENTS
// ============================================================================

// --- SCALED DOWN: Home View ---
const HomeView = ({
  onNewBook,
  onShowList,
  hasApiKey,
  bookCount,
  theme,
}: {
  onNewBook: () => void;
  onShowList: () => void;
  hasApiKey: boolean;
  bookCount: number;
  theme: 'light' | 'dark';
}) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
    {theme === 'dark' && (
      <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
    )}
    <div className="relative z-10 max-w-2xl mx-auto animate-fade-in-up">
      <div className="relative w-24 h-24 mx-auto mb-6">
        {theme === 'dark' && (
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-30 animate-subtle-glow"></div>
        )}
        <img src="/white-logo.png" alt="Pustakam Logo" className="w-24 h-24 relative logo-img" />
      </div>
      <h1 className="text-4xl font-bold mb-4 text-[var(--color-text-primary)]">Turn Ideas into Books</h1>
      <p className="text-lg text-[var(--color-text-secondary)] mb-10">
        Pustakam is an AI-powered engine that transforms your concepts into fully-structured
        digital books.
      </p>
      {hasApiKey ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onNewBook}
            className="btn btn-primary shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4" />
            Create New Book
          </button>
          {bookCount > 0 && (
            <button onClick={onShowList} className="btn btn-secondary w-full sm:w-auto">
              <List className="w-4 h-4" />
              View My Books
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[var(--color-card)] p-6 rounded-xl max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">API Key Required</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Please configure your API key in Settings to begin.
          </p>
        </div>
      )}
    </div>
  </div>
);

// --- SCALED DOWN: Book List ---
const BookListGrid = ({
  books,
  onSelectBook,
  onDeleteBook,
  setView,
  setShowListInMain,
}: {
  books: BookProject[];
  onSelectBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  setView: (view: AppView) => void;
  setShowListInMain: (show: boolean) => void;
}) => {
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  const getStatusIcon = (status: BookProject['status']) => {
    const iconMap: Record<BookProject['status'], React.ElementType> = {
      planning: Clock,
      generating_roadmap: Loader2,
      roadmap_completed: ListChecks,
      generating_content: Loader2,
      assembling: Box,
      completed: CheckCircle,
      error: AlertCircle,
    };
    const Icon = iconMap[status] || Loader2;
    const colorClass =
      status === 'completed'
        ? 'text-green-500'
        : status === 'error'
        ? 'text-red-500'
        : 'text-blue-500';
    const animateClass = ['generating_roadmap', 'generating_content', 'assembling'].includes(
      status
    )
      ? 'animate-spin'
      : '';
    return <Icon className={`w-4 h-4 ${colorClass} ${animateClass}`} />;
  };

  const getStatusText = (status: BookProject['status']) =>
    ({
      planning: 'Planning',
      generating_roadmap: 'Creating Roadmap',
      roadmap_completed: 'Ready to Write',
      generating_content: 'Writing Chapters',
      assembling: 'Finalizing Book',
      completed: 'Completed',
      error: 'Error',
    }[status] || 'Unknown');

  const getStatusColor = (status: BookProject['status']) => {
    const colors = {
      completed: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      generating_content: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
      assembling: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
      roadmap_completed: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      error: 'from-red-500/20 to-pink-500/20 border-red-500/30',
      planning: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
      generating_roadmap: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    };
    return colors[status] || 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
  };

  const getReadingProgress = (bookId: string) => {
    return readingProgressUtils.getBookmark(bookId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">My Library</h1>
          <p className="text-[var(--color-text-secondary)] mt-1 text-sm">{books.length} {books.length === 1 ? 'project' : 'projects'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowListInMain(false)} className="btn btn-secondary btn-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => {
              setView('create');
              setShowListInMain(false);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-4 h-4" /> New Book
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-card)] rounded-full flex items-center justify-center border border-[var(--color-border)]">
            <BookOpen className="w-10 h-10 text-[var(--color-text-secondary)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">No books yet</h3>
          <p className="text-[var(--color-text-secondary)] mb-6">Create your first AI-generated book to get started</p>
          <button
            onClick={() => {
              setView('create');
              setShowListInMain(false);
            }}
            className="btn btn-primary"
          >
            <Sparkles className="w-4 h-4" /> Create First Book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const isHovering = hoveredBookId === book.id;
            const readingProgress = getReadingProgress(book.id);
            const hasBookmark = readingProgress && book.status === 'completed';

            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                onMouseEnter={() => setHoveredBookId(book.id)}
                onMouseLeave={() => setHoveredBookId(null)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer group
                  ${isHovering ? 'scale-[1.02] shadow-2xl' : 'scale-100 shadow-lg'}
                  bg-gradient-to-br ${getStatusColor(book.status)}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-5 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1.5 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-all">
                          {book.title}
                        </h3>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }}
                        className="ml-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-900/20 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 px-2.5 py-1 bg-black/30 rounded-full border border-white/10 w-fit mb-4">
                      {getStatusIcon(book.status)}
                      <span className="text-xs font-medium text-gray-300 capitalize">{getStatusText(book.status)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                      <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 text-center">
                        <div className="text-xs text-gray-400 mb-1">Modules</div>
                        <div className="text-base font-bold text-white">{book.modules.length}</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 text-center">
                        <div className="text-xs text-gray-400 mb-1">Words</div>
                        <div className="text-base font-bold text-white">
                          {book.totalWords ? `${(book.totalWords / 1000).toFixed(1)}K` : '0'}
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 text-center">
                        <div className="text-xs text-gray-400 mb-1">
                          {hasBookmark ? 'Read' : 'Progress'}
                        </div>
                        <div className="text-base font-bold text-white">
                          {hasBookmark ? `${readingProgress.percentComplete}%` : `${Math.round(book.progress)}%`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {hasBookmark ? (
                      <div>
                        <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${readingProgress.percentComplete}%` }}
                          />
                        </div>
                      </div>
                    ) : (book.status !== 'completed' && book.status !== 'error') && (
                      <div>
                        <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full relative"
                            style={{ width: `${Math.min(100, Math.max(0, book.progress))}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {book.status === 'completed' && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


const DetailTabButton = ({
  label,
  Icon,
  isActive,
  onClick,
}: {
  label: ReactNode;
  Icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
      isActive
        ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
        : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);


// ============================================================================
// MAIN BOOKVIEW COMPONENT
// ============================================================================
export function BookView({
  books,
  currentBookId,
  onCreateBookRoadmap,
  onGenerateAllModules,
  onRetryFailedModules,
  onAssembleBook,
  onSelectBook,
  onDeleteBook,
  hasApiKey,
  view,
  setView,
  onUpdateBookContent,
  showListInMain,
  setShowListInMain,
  isMobile = false,
  generationStatus,
  generationStats,
  onPauseGeneration,
  onResumeGeneration,
  isGenerating,
  onRetryDecision,
  availableModels,
  theme,
}: BookViewProps) {
  const [detailTab, setDetailTab] = useState<'overview' | 'analytics' | 'read'>('overview');
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<BookSession>({
    goal: '',
    language: 'en',
    targetAudience: '',
    complexityLevel: 'intermediate',
    reasoning: '',
    preferences: {
      includeExamples: true,
      includePracticalExercises: false,
      includeQuizzes: false,
    },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const currentBook = currentBookId ? books.find(b => b.id === currentBookId) : null;
  const [pdfProgress, setPdfProgress] = useState(0);
  useEffect(() => {
    if (currentBook) {
      const isGen = ['generating_roadmap', 'generating_content', 'assembling'].includes(
        currentBook.status
      );
      setLocalIsGenerating(isGen);
      setIsEditing(false);
    }
  }, [currentBook]);
  useEffect(() => {
    return () => {
      if (currentBookId) bookService.cancelActiveRequests(currentBookId);
    };
  }, [currentBookId]);
  const handleCreateRoadmap = async () => {
    if (!formData.goal.trim() || !hasApiKey) return;
    setLocalIsGenerating(true);
    try {
      await onCreateBookRoadmap(formData);
    } catch (error) {
      console.error('Failed to create roadmap:', error);
    } finally {
      setLocalIsGenerating(false);
    }
  };
  const handleStartGeneration = async () => {
    if (!currentBook) return;
    setLocalIsGenerating(true);
    try {
      await onGenerateAllModules(currentBook, {
        goal: currentBook.goal,
        language: currentBook.language,
        targetAudience: formData.targetAudience || currentBook.goal,
        complexityLevel: formData.complexityLevel || 'intermediate',
        reasoning: formData.reasoning || currentBook.reasoning,
        preferences: formData.preferences || {
          includeExamples: true,
          includePracticalExercises: false,
          includeQuizzes: false,
        },
      });
    } catch (error) {
      console.error('Failed to generate modules:', error);
    } finally {
      setLocalIsGenerating(false);
    }
  };
  const handlePause = () => {
    if (currentBook && onPauseGeneration) {
      onPauseGeneration(currentBook.id);
    }
  };
  const handleResume = () => {
    if (currentBook && onResumeGeneration) {
      onResumeGeneration(currentBook, {
        goal: currentBook.goal,
        language: currentBook.language,
        targetAudience: formData.targetAudience || currentBook.goal,
        complexityLevel: formData.complexityLevel || 'intermediate',
        reasoning: formData.reasoning || currentBook.reasoning,
        preferences: formData.preferences || {
          includeExamples: true,
          includePracticalExercises: false,
          includeQuizzes: false,
        },
      });
    }
  };
  const handleStartAssembly = async () => {
    if (!currentBook) return;
    setLocalIsGenerating(true);
    try {
      await onAssembleBook(currentBook, {
        goal: currentBook.goal,
        language: currentBook.language,
        targetAudience: formData.targetAudience || currentBook.goal,
        complexityLevel: formData.complexityLevel || 'intermediate',
        reasoning: formData.reasoning || currentBook.reasoning,
        preferences: formData.preferences || {
          includeExamples: true,
          includePracticalExercises: false,
          includeQuizzes: false,
        },
      });
    } catch (error) {
      console.error('Failed to assemble book:', error);
    } finally {
      setLocalIsGenerating(false);
    }
  };
  const handleDownloadPdf = async () => {
    if (!currentBook) return;
    setPdfProgress(1);
    await pdfService.generatePdf(currentBook, setPdfProgress);
    setTimeout(() => setPdfProgress(0), 2000);
  };
  const handleStartEditing = () => {
    if (currentBook?.finalBook) {
      setEditedContent(currentBook.finalBook);
      setIsEditing(true);
    }
  };
  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedContent('');
  };
  const handleSaveChanges = () => {
    if (currentBook && editedContent) {
      onUpdateBookContent(currentBook.id, editedContent);
      setIsEditing(false);
      setEditedContent('');
    }
  };
  const getStatusIcon = (status: BookProject['status']) => {
    const iconMap: Record<BookProject['status'], React.ElementType> = {
      planning: Clock,
      generating_roadmap: Loader2,
      roadmap_completed: ListChecks,
      generating_content: Loader2,
      assembling: Box,
      completed: CheckCircle,
      error: AlertCircle,
    };
    const Icon = iconMap[status] || Loader2;
    const colorClass =
      status === 'completed'
        ? 'text-green-500'
        : status === 'error'
        ? 'text-red-500'
        : 'text-blue-500';
    const animateClass = ['generating_roadmap', 'generating_content', 'assembling'].includes(
      status
    )
      ? 'animate-spin'
      : '';
    return <Icon className={`w-4 h-4 ${colorClass} ${animateClass}`} />;
  };
  const getStatusText = (status: BookProject['status']) =>
    ({
      planning: 'Planning',
      generating_roadmap: 'Creating Roadmap',
      roadmap_completed: 'Ready to Write',
      generating_content: 'Writing Chapters',
      assembling: 'Finalizing Book',
      completed: 'Completed',
      error: 'Error',
    }[status] || 'Unknown');

  // ============================================================================
  // VIEW RENDERING
  // ============================================================================
  if (view === 'list') {
    if (showListInMain)
      return (
        <BookListGrid
          books={books}
          onSelectBook={onSelectBook}
          onDeleteBook={onDeleteBook}
          setView={setView}
          setShowListInMain={setShowListInMain}
        />
      );
    return (
      <HomeView
        onNewBook={() => setView('create')}
        onShowList={() => setShowListInMain(true)}
        hasApiKey={hasApiKey}
        bookCount={books.length}
        theme={theme}
      />
    );
  }
  
// --- SIMPLE MINIMAL CREATE VIEW ---
  if (view === 'create') {
    return (
      <div className="w-full max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => {
            setView('list');
            setShowListInMain(false);
          }}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Create New Book</h1>
          <p className="text-[var(--color-text-secondary)]">Describe what you want to learn and AI will structure it for you.</p>
        </div>

        <div className="space-y-6">
          {/* Learning Goal */}
          <div>
            <label htmlFor="goal" className="block text-sm font-medium mb-2">
              Learning Goal
            </label>
            <textarea
              id="goal"
              value={formData.goal}
              onChange={(e) => setFormData((p) => ({ ...p, goal: e.target.value }))}
              placeholder="e.g., Master advanced TypeScript for scalable applications"
              className="textarea-style"
              rows={3}
              required
            />
          </div>

          {/* Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="audience" className="block text-sm font-medium mb-2">
                Target Audience
              </label>
              <input
                id="audience"
                type="text"
                value={formData.targetAudience}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, targetAudience: e.target.value }))
                }
                placeholder="e.g., Software Developers"
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="complexity" className="block text-sm font-medium mb-2">
                Complexity Level
              </label>
              <CustomSelect
                value={formData.complexityLevel || 'intermediate'}
                onChange={(val) =>
                  setFormData((p) => ({ ...p, complexityLevel: val as any }))
                }
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
              />
              Advanced Options
            </button>
            {showAdvanced && (
              <div className="space-y-4 animate-fade-in-up">
                <div>
                  <label htmlFor="reasoning" className="block text-sm font-medium mb-2">
                    Context & Reasoning (Optional)
                  </label>
                  <textarea
                    id="reasoning"
                    value={formData.reasoning}
                    onChange={(e) => setFormData((p) => ({ ...p, reasoning: e.target.value }))}
                    placeholder="Explain the 'why' behind this book..."
                    className="textarea-style"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Content Preferences
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferences?.includeExamples}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            preferences: { ...p.preferences!, includeExamples: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className="text-sm">Include Code Examples</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferences?.includePracticalExercises}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            preferences: {
                              ...p.preferences!,
                              includePracticalExercises: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className="text-sm">Include Practice Exercises</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleCreateRoadmap}
            disabled={!formData.goal.trim() || !hasApiKey || localIsGenerating}
            className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localIsGenerating ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                Generating Roadmap...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Book Roadmap
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
  
  // --- FINAL, SCALED DOWN DETAIL VIEW ---
  if (view === 'detail' && currentBook) {
    const areAllModulesDone =
      currentBook.roadmap &&
      currentBook.modules.length === currentBook.roadmap.modules.length &&
      currentBook.modules.every((m) => m.status === 'completed');
    const failedModules = currentBook.modules.filter((m) => m.status === 'error');
    const completedModules = currentBook.modules.filter((m) => m.status === 'completed');
    const isPaused = generationStatus?.status === 'paused';
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <button
            onClick={() => {
              setView('list');
              onSelectBook(null);
              setShowListInMain(true);
            }}
            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Books
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-1.5">{currentBook.title}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {getStatusIcon(currentBook.status)}
              {getStatusText(currentBook.status)}
            </div>
          </div>
        </div>

        {currentBook.status === 'completed' && (
          <div className="border-b border-[var(--color-border)] mb-8">
            <div className="flex items-center gap-6">
              <DetailTabButton
                label="Overview"
                Icon={ListChecks}
                isActive={detailTab === 'overview'}
                onClick={() => setDetailTab('overview')}
              />
              <DetailTabButton
                label="Analytics"
                Icon={BarChart3}
                isActive={detailTab === 'analytics'}
                onClick={() => setDetailTab('analytics')}
              />
              <DetailTabButton
                label="Read Book"
                Icon={BookText}
                isActive={detailTab === 'read'}
                onClick={() => setDetailTab('read')}
              />
            </div>
          </div>
        )}
        
        <div className="space-y-6">
            {detailTab === 'analytics' && currentBook.status === 'completed' ? (
              <BookAnalytics book={currentBook} />
            ) : detailTab === 'read' && currentBook.status === 'completed' ? (
              <ReadingMode
                content={currentBook.finalBook || ''}
                isEditing={isEditing}
                editedContent={editedContent}
                onEdit={handleStartEditing}
                onSave={handleSaveChanges}
                onCancel={handleCancelEditing}
                onContentChange={setEditedContent}
                bookId={currentBook.id}
                currentModuleIndex={0} // You can track actual module if needed
              />
            ) : (
              <>
                {(isGenerating || isPaused || generationStatus?.status === 'waiting_retry') &&
                  currentBook.status !== 'completed' &&
                      generationStatus &&
                      generationStats && (
                            <EmbeddedProgressPanel
                            generationStatus={generationStatus}
                              stats={generationStats}
                              onCancel={() => {
                              if (window.confirm('Cancel generation? Progress will be saved.')) {
                            bookService.cancelActiveRequests(currentBook.id);
                            }
                          }}
                        onPause={handlePause}
                        onResume={handleResume}
                        onRetryDecision={onRetryDecision}
                    availableModels={availableModels}
                  />
                )}
                {currentBook.status === 'roadmap_completed' &&
                  !areAllModulesDone &&
                  !isGenerating && !isPaused && generationStatus?.status !== 'waiting_retry' && (
                    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-7">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg">
                          <Play className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            Ready to Generate Content
                          </h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                            {completedModules.length > 0
                              ? `Resume from ${completedModules.length} completed modules`
                              : 'Start generating all modules'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-5">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                          <div className="text-sm text-gray-300">
                            <p className="font-medium text-white mb-2">Smart Recovery Enabled</p>
                            <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                              <li>✓ Progress is saved automatically</li>
                              <li>✓ Failed modules will be retried with smart options</li>
                              <li>✓ You can safely close and resume later</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleStartGeneration}
                        disabled={localIsGenerating}
                        className="btn btn-primary w-full py-2.5"
                      >
                        {localIsGenerating ? (
                          <><Loader2 className="animate-spin" /> Generating...</>
                        ) : (
                          <><Play className="w-4 h-4" />
                            {completedModules.length > 0
                              ? 'Resume Generation'
                              : 'Generate All Modules'}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                {areAllModulesDone && currentBook.status !== 'completed' && !localIsGenerating && (
                  <div className="bg-[var(--color-card)] border border-green-500/30 rounded-lg p-7 space-y-5 animate-fade-in-up">
                    <div className="text-center">
                      <div className="w-12 h-12 flex items-center justify-center bg-green-500/10 rounded-full mx-auto mb-3">
                        <CheckCircle className="w-7 h-7 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Generation Complete!</h3>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
                        All chapters written. Ready to assemble.
                      </p>
                    </div>
                    <button onClick={handleStartAssembly} className="btn btn-primary w-full py-2.5">
                      <Box className="w-5 h-5" />
                      Assemble Final Book
                    </button>
                  </div>
                )}
                {currentBook.status === 'completed' && (
                    <div className="space-y-6">
                      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-7">
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Generation Complete</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                              Your book is ready to read and download.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button onClick={() => setDetailTab('read')} className="btn btn-primary justify-center py-2.5">
                            <Eye className="w-4 h-4" /> Read Book
                          </button>
                          <button onClick={() => bookService.downloadAsMarkdown(currentBook)} className="btn btn-secondary justify-center py-2.5">
                            <Download className="w-4 h-4" /> Download .MD
                          </button>
                          <button
                            onClick={handleDownloadPdf}
                            disabled={pdfProgress > 0}
                            className="btn bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all py-2.5"
                          >
                            {pdfProgress > 0 ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> PDF ({pdfProgress}%)</>
                            ) : (
                              <><Download className="w-4 h-4" /> Download PDF</>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {currentBook.modules.length}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">Chapters</div>
                        </div>
                        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {(currentBook.totalWords || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">Words</div>
                        </div>
                        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {currentBook.roadmap?.estimatedReadingTime || 'N/A'}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">Est. Reading</div>
                        </div>
                        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-[var(--color-text-primary)] capitalize">
                            {currentBook.roadmap?.difficultyLevel || 'N/A'}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">Level</div>
                        </div>
                      </div>
                    </div>
                  )}
                {currentBook.status === 'assembling' && (
                  <div className="bg-zinc-900/60 backdrop-blur-xl border-2 rounded-lg p-8 space-y-6 animate-assembling-glow text-center">
                      <div className="relative w-14 h-14 mx-auto">
                        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                        <div className="relative w-14 h-14 flex items-center justify-center bg-green-500/10 rounded-full">
                          <Box className="w-7 h-7 text-green-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Assembling Your Book</h3>
                        <p className="text-[var(--color-text-secondary)] mt-1.5 max-w-md mx-auto text-sm">
                          Finalizing chapters and preparing for download...
                        </p>
                      </div>
                    <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden border border-white/10">
                      <div className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 rounded-full animate-slide-in-out"></div>
                    </div>
                  </div>
                )}
                {currentBook.roadmap &&
                  (currentBook.status !== 'completed' && !isGenerating && !isPaused && generationStatus?.status !== 'waiting_retry') && (
                    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-7">
                      <div className="flex items-center gap-3 mb-5">
                        <ListChecks className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold">Learning Roadmap</h3>
                      </div>
                      <div className="space-y-3">
                        {currentBook.roadmap.modules.map((module, index) => {
                          const completedModule = currentBook.modules.find(
                            (m) => m.roadmapModuleId === module.id
                          );
                          const isActive =
                            generationStatus?.currentModule?.id === module.id;
                          return (
                            <div
                              key={module.id}
                              className={`flex items-center gap-3.5 p-3.5 rounded-lg border transition-all ${
                                isActive
                                  ? 'bg-blue-500/10 border-blue-500/40'
                                  : completedModule?.status === 'completed'
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : completedModule?.status === 'error'
                                  ? 'border-red-500/30 bg-red-500/5'
                                  : 'bg-zinc-800/30 border-zinc-800/50'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                  completedModule?.status === 'completed'
                                    ? 'bg-emerald-500 text-white'
                                    : completedModule?.status === 'error'
                                    ? 'bg-red-500 text-white'
                                    : isActive
                                    ? 'bg-blue-500 text-white animate-pulse'
                                    : 'bg-zinc-700 text-zinc-500'
                                }`}
                              >
                                {completedModule?.status === 'completed' ? (
                                  <Check size={14} />
                                ) : completedModule?.status === 'error' ? (
                                  <X size={14} />
                                ) : isActive ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-base text-white">
                                  {module.title}
                                </h4>
                                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{module.estimatedTime}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </>
            )}
        </div>
      </div>
    );
  }
  return null;
}
