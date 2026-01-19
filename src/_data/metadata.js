/**
 * Site metadata for RSS feeds and SEO
 * In production, the URL would come from environment variables
 */

export default function() {
  return {
    url: process.env.SITE_URL || "https://example.com",
    language: "en"
  };
}
