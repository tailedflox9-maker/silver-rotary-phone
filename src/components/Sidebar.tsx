import React, { useState, useMemo } from 'react';
import {
  Trash2, Search, Beaker, Palette, Building, Cpu, Book, ChevronLeft, ChevronRight, Settings, User
} from 'lucide-react';
import { BookProject, BookCategory } from '../types';

interface SidebarProps {
  books: BookProject[];
  currentBookId: string | null;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  onOpenSettings: () => void;
  onNewBook: () => void;
  onCloseSidebar: () => void;
  isSidebarOpen: boolean;
  isFolded?: boolean;
  onToggleFold?: () => void;
}

const getCategoryIcon = (category?: BookCategory) => {
  switch (category) {
    case 'programming': return Cpu;
    case 'science': return Beaker;
    case 'art': return Palette;
    case 'business': return Building;
    case 'general': return Book;
    default: return Book;
  }
};

export function Sidebar({
  books,
  currentBookId,
  onSelectBook,
  onDeleteBook,
  onOpenSettings,
  onNewBook,
  isFolded = false,
  onToggleFold,
  isSidebarOpen,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const sortedBooks = useMemo(() => {
    const filtered = books.filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [books, searchQuery]);

  const sidebarClasses = `
    sidebar
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0
    ${isFolded ? 'w-20' : 'w-72'}
  `;

  return (
    <aside className={sidebarClasses}>
        {/* New Book Button */}
        <div className={`p-4 border-b border-[var(--color-border)] ${isFolded ? 'flex justify-center' : ''}`}>
             <button
                onClick={onNewBook}
                className={`w-full btn btn-primary transition-all duration-300 ${isFolded ? 'w-auto' : ''}`}
            >
                <span className={isFolded ? 'hidden' : 'inline'}>+ New Book</span>
                <span className={!isFolded ? 'hidden' : 'inline'}>+</span>
            </button>
        </div>

      {/* Section 2: Books List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!isFolded && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
            />
          </div>
        )}
        {sortedBooks.map(book => {
          const isSelected = currentBookId === book.id;
          const CategoryIcon = getCategoryIcon(book.category);
          return (
            <div
              key={book.id}
              onClick={() => onSelectBook(book.id)}
              className={`group relative flex items-center w-full rounded-lg cursor-pointer transition-all duration-200 ${isFolded ? 'justify-center p-3' : 'gap-3 p-2.5'} ${isSelected ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/5'}`}
              title={isFolded ? book.title : undefined}
            >
              <CategoryIcon className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-black' : 'text-gray-400'}`} />
              {!isFolded && (
                <span className="text-sm font-medium truncate flex-1">{book.title}</span>
              )}
              {!isFolded && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }}
                  className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-gray-600 hover:bg-black/10 hover:text-red-500' : 'text-gray-500 hover:bg-red-900/20 hover:text-red-400'}`}
                  title="Delete book"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - Settings and Creator Credit, with Collapse Button */}
      <div className="border-t border-[var(--color-border)] p-3">
        {isFolded ? (
          <div className="flex flex-col items-center gap-2">
            <button onClick={onOpenSettings} className="p-2.5 text-gray-300 hover:bg-white/10 rounded-lg transition-colors w-full" title="Settings">
              <Settings size={18} />
            </button>
            {onToggleFold && (
              <button onClick={onToggleFold} className="p-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors w-full" title="Expand sidebar">
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button onClick={onOpenSettings} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors">
                <Settings size={16} /> Settings
              </button>
              {onToggleFold && (
                <button onClick={onToggleFold} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors" title="Collapse sidebar">
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 px-2">
                <User size={14} />
                <span>by</span>
                <a href="https://linkedin.com/in/tanmay-kalbande" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-400 hover:text-white">
                    Tanmay Kalbande
                </a>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
