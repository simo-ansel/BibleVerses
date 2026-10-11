/** All route paths in one place, so screens never spell out URLs. */
import { router } from 'expo-router';

import { getBook } from '@/core/bible/catalog';
import type { ChapterRef } from '@/core/bible/types';

export function openChapter(ref: ChapterRef, verse?: number): void {
  router.push({
    pathname: '/chapter/[book]/[chapter]',
    params: { book: String(ref.bookId), chapter: String(ref.chapter), ...(verse ? { verse: String(verse) } : {}) },
  });
}

/** Replaces the current chapter (used by previous/next so the back button returns to where reading started). */
export function replaceChapter(ref: ChapterRef): void {
  router.replace({
    pathname: '/chapter/[book]/[chapter]',
    params: { book: String(ref.bookId), chapter: String(ref.chapter) },
  });
}

/** Opens the chapter grid, or the text directly for one-chapter books. */
export function openBook(bookId: number): void {
  const book = getBook(bookId);
  if (book.chapters.length === 1) openChapter({ bookId, chapter: book.chapters[0] });
  else router.push({ pathname: '/book/[id]', params: { id: String(bookId) } });
}

export function openSettings(): void {
  router.push('/settings');
}

export function openToday(): void {
  router.navigate('/');
}

export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
