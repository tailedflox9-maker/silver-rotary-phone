// src/utils/readingProgress.ts
import { ReadingBookmark } from '../types/book';

const BOOKMARK_KEY = 'pustakam-reading-bookmarks';

export const readingProgressUtils = {
  // Save bookmark for a book
  saveBookmark(bookId: string, moduleIndex: number, scrollPosition: number): void {
    try {
      const bookmarks = this.getAllBookmarks();
      const totalModules = this.getBookModuleCount(bookId);
      const percentComplete = totalModules > 0 ? ((moduleIndex + 1) / totalModules) * 100 : 0;

      bookmarks[bookId] = {
        bookId,
        moduleIndex,
        scrollPosition,
        lastReadAt: new Date(),
        percentComplete: Math.round(percentComplete)
      };

      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  },

  // Get bookmark for a book
  getBookmark(bookId: string): ReadingBookmark | null {
    try {
      const bookmarks = this.getAllBookmarks();
      const bookmark = bookmarks[bookId];
      
      if (bookmark) {
        return {
          ...bookmark,
          lastReadAt: new Date(bookmark.lastReadAt)
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get bookmark:', error);
      return null;
    }
  },

  // Get all bookmarks
  getAllBookmarks(): Record<string, ReadingBookmark> {
    try {
      const stored = localStorage.getItem(BOOKMARK_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get bookmarks:', error);
      return {};
    }
  },

  // Delete bookmark
  deleteBookmark(bookId: string): void {
    try {
      const bookmarks = this.getAllBookmarks();
      delete bookmarks[bookId];
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  },

  // Get book module count (helper)
  getBookModuleCount(bookId: string): number {
    try {
      const booksJson = localStorage.getItem('pustakam-books');
      if (!booksJson) return 0;
      
      const books = JSON.parse(booksJson);
      const book = books.find((b: any) => b.id === bookId);
      return book?.modules?.length || 0;
    } catch (error) {
      return 0;
    }
  },

  // Format last read time
  formatLastRead(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
};
