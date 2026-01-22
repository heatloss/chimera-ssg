/**
 * Comic data fetcher
 * Fetches manifest from Chimera CMS API and transforms it for templates
 */

import 'dotenv/config';

export default async function() {
  const apiBase = process.env.CMS_API_URL || 'https://api.chimeracomics.org';
  const comicSlug = process.env.COMIC_SLUG;

  if (!comicSlug) {
    throw new Error('COMIC_SLUG environment variable is required');
  }

  const manifestUrl = `${apiBase}/api/pub/v1/comics/${comicSlug}/manifest.json`;

  console.log(`Fetching manifest from: ${manifestUrl}`);

  const response = await fetch(manifestUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
  }

  const manifest = await response.json();

  // Flatten all pages for easier iteration and navigation
  const allPages = manifest.chapters.flatMap(chapter =>
    chapter.pages.map(page => ({
      ...page,
      chapterTitle: chapter.title,
      chapterId: chapter.id
    }))
  );

  // Navigation helpers
  const navigation = {
    firstPage: allPages[0],
    lastPage: allPages[allPages.length - 1],
    totalPages: allPages.length
  };

  // TODO: These may come from a separate CMS endpoint or be added to the manifest
  // For now, using empty arrays as placeholders
  const socialLinks = manifest.socialLinks || [];
  const navLinks = manifest.navLinks || [];

  return {
    meta: manifest.meta,
    chapters: manifest.chapters,
    allPages,
    navigation,
    socialLinks,
    navLinks,
    apiBase
  };
}
