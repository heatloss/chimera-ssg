import pluginRss from "@11ty/eleventy-plugin-rss";
import pluginWebc from "@11ty/eleventy-plugin-webc";

export default function(eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/**/*.webc"
  });

  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");

  // Custom filters for comic navigation
  eleventyConfig.addFilter("getPrevPage", (pages, currentSlug) => {
    const index = pages.findIndex(p => p.slug === currentSlug);
    return index > 0 ? pages[index - 1] : null;
  });

  eleventyConfig.addFilter("getNextPage", (pages, currentSlug) => {
    const index = pages.findIndex(p => p.slug === currentSlug);
    return index < pages.length - 1 ? pages[index + 1] : null;
  });

  eleventyConfig.addFilter("getFirstPage", (pages) => {
    return pages.length > 0 ? pages[0] : null;
  });

  eleventyConfig.addFilter("getLastPage", (pages) => {
    return pages.length > 0 ? pages[pages.length - 1] : null;
  });

  // Format date for display
  eleventyConfig.addFilter("formatDate", (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  // Format date for datetime attribute
  eleventyConfig.addFilter("isoDate", (date) => {
    return new Date(date).toISOString().split("T")[0];
  });

  // Convert string date to Date object (for RSS plugin compatibility)
  eleventyConfig.addFilter("toDate", (dateString) => {
    return new Date(dateString);
  });

  // Get current year
  eleventyConfig.addFilter("currentYear", () => {
    return new Date().getFullYear();
  });

  // Transform to add DOCTYPE and document structure for pages missing it
  eleventyConfig.addTransform("htmlWrapper", function(content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      const trimmed = content.trim();
      // If the content doesn't start with DOCTYPE, wrap it
      if (!trimmed.toLowerCase().startsWith("<!doctype")) {
        // Find where <head> content starts (first <meta> or similar)
        const headContentMatch = trimmed.match(/^(\s*<meta|<title|<link)/i);
        if (headContentMatch) {
          // Find where body content starts (after </head> equivalent - first structural element)
          const bodyStartMatch = trimmed.match(/(<header|<main|<nav|<article|<section|<div|<footer)/i);
          if (bodyStartMatch) {
            const bodyStartIndex = trimmed.indexOf(bodyStartMatch[0]);
            const headContent = trimmed.substring(0, bodyStartIndex).trim();
            const bodyContent = trimmed.substring(bodyStartIndex).trim();
            return `<!DOCTYPE html>\n<html lang="en">\n<head>\n${headContent}\n</head>\n<body>\n${bodyContent}\n</body>\n</html>`;
          }
        }
      }
    }
    return content;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "webc"
  };
}
