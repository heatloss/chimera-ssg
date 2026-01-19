# Chimera SSG - Project Context

## Overview

This is an 11ty-based Static Site Generator for webcomic websites. It fetches data from the Chimera CMS and generates a complete static site that can be deployed to any web host.

## Architecture

```
CMS (Chimera) → GitHub Actions → SSG (11ty) → ZIP → Deployer (comic owner's host)
```

1. CMS sends `repository_dispatch` webhook to GitHub with metadata:
   ```json
   {
     "comic_slug": "my-comic",
     "comic_id": "abc123",
     "deploy_url": "https://mycomic.com/deployer.php",
     "deploy_secret": "secret-key"
   }
   ```
2. GitHub Actions runs the build
3. 11ty fetches manifest from CMS API: `${CMS_API_URL}/api/pub/v1/comics/${COMIC_SLUG}/manifest.json`
4. Built site is zipped and POSTed to the deployer

## Tech Stack

- **11ty v3.x** - Static site generator
- **WebC** - Templating language (chosen over Nunjucks for Alpine.js-like syntax)
- **dotenv** - Environment variable management

## Key Files

### Data Layer
- `src/_data/comic.js` - Fetches manifest from CMS API, transforms data for templates

### Templates
- `src/comic/comic.webc` - Paginated comic pages (one per comic page)
- `src/index.webc` - Home page (displays latest comic page)
- `src/archive.webc` - Archive page (grid of all pages by chapter)
- `src/about.webc` - About page
- `src/feed.njk` - RSS feed (Nunjucks, acceptable for XML output)

### Layout/Components
- `src/_includes/components/base-layout.webc` - Main layout component
- `src/_includes/components/site-header.webc` - Header with navigation
- `src/_includes/components/site-footer.webc` - Footer
- `src/_includes/components/social-links-sidebar.webc` - Social links for desktop
- `src/_includes/components/social-links-mobile.webc` - Social links for mobile
- `src/_includes/components/page-nav.webc` - Navigation component (has issues, see below)

### Configuration
- `eleventy.config.js` - 11ty config with WebC plugin and HTML wrapper transform
- `.env` / `.env.example` - Environment variables

## Environment Variables

```
CMS_API_URL=https://api.chimeracomics.org  # Remote CMS API (currently configured)
COMIC_SLUG=automans-daughter               # Which comic to build
```

For local CMS testing, change to `http://localhost:3333`. Production values come from GitHub Actions secrets/workflow.

## WebC Workarounds

WebC has limitations that required specific workarounds:

### 1. Layout + Pagination Slot Bug
**Problem:** When using WebC pagination with a layout, content doesn't render in the layout's `<slot>`.

**Solution:** Don't use `layout` frontmatter. Instead, call the layout as a component with explicit props:
```webc
<base-layout
  webc:nokeep
  :@comic="comic"
  :@page="page"
  :@page-title="pageTitle"
>
  <!-- content here -->
</base-layout>
```

### 2. webc:setup Runs Once Per File
**Problem:** `webc:setup` runs once per file, not per paginated instance. Navigation calculated in `webc:setup` is the same for all pages.

**Solution:** Use `eleventyComputed` in JS frontmatter for per-page calculations:
```js
---js
{
  pagination: { data: "comic.allPages", size: 1, alias: "page" },
  eleventyComputed: {
    nav: (data) => {
      const pages = data.comic.allPages;
      const currentIndex = pages.findIndex(p => p.slug === data.page.slug);
      return {
        first: pages[0],
        last: pages[pages.length - 1],
        prev: currentIndex > 0 ? pages[currentIndex - 1] : null,
        next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
        isFirst: currentIndex === 0,
        isLast: currentIndex === pages.length - 1
      };
    }
  }
}
---
```

### 3. Missing DOCTYPE/HTML Structure
**Problem:** WebC strips `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` tags.

**Solution:** 11ty transform in `eleventy.config.js` wraps output in proper HTML structure.

### 4. Computed Values in Attribute Bindings
**Problem:** Using `eleventyComputed` functions with `:attribute="value"` can output function code instead of the resolved value.

**Solution:** Compute inline in the template:
```webc
<!-- Instead of :datetime="isoDate" -->
<time :datetime="new Date(page.publishedDate).toISOString().split('T')[0]">
```

## Image URLs

The manifest contains relative image paths. Templates prepend `comic.apiBase`:
```webc
<img :src="comic.apiBase + page.image.mobile" />
```

Final URLs: `https://api.chimeracomics.org/api/pub/media/mobile/page1.webp`

## What's Working

- Fetching manifest from remote CMS API (api.chimeracomics.org)
- Generating all comic pages with correct navigation
- Home page showing latest comic page
- Archive page with chapter groupings
- About page
- Image URLs correctly constructed (pointing to CMS image optimizer)
- Responsive images with srcset
- Author notes (conditional display)
- Open Graph meta tags
- **PHP Deployer** - Tested and working on Dreamhost (comic.the-ottoman.com)
- **Node.js deploy script** - `scripts/deploy-to-host.js` zips and POSTs to deployer
- **GitHub Actions workflow** - `.github/workflows/build-deploy.yml` tested via manual dispatch
- **Creator extras/** - Custom content directory that survives deploys

## GitHub Repository

- **Remote:** https://github.com/heatloss/chimera-ssg
- **Required variable:** `CMS_API_URL` (set in repo settings → Variables → Actions)

## PHP Deployer Setup (Tested on Dreamhost)

The deployer uses a `site/` subdirectory approach with .htaccess rewrites:

```
~/mycomic.com/
├── deployer.php      <- Receives ZIP uploads
├── .htaccess         <- Rewrites requests, allows GitHub Actions access
├── releases/         <- Timestamped release folders
│   └── 20260118-.../
├── site/             <- Symlink to current release
└── extras/           <- Creator-managed content (survives deploys)
```

**Key files in `docs/`:**
- `SAMPLE DEPLOYER.php.example` - PHP script for receiving deploys
- `SAMPLE HTACCESS.example` - Apache rewrite rules (includes cloud IP fix)

**Setup steps for a new host:**
1. Upload `deployer.php` to domain root
2. Upload `.htaccess` to domain root
3. Set a unique `$SECRET_KEY` in deployer.php
4. Test: visit `https://yourdomain.com/deployer.php` → "Deployer ready"

**Important .htaccess notes:**
- Includes `<Files "deployer.php">Require all granted</Files>` - required for GitHub Actions to reach the deployer (some hosts block cloud provider IPs by default)
- Supports `extras/` directory for creator-managed content that persists across deploys

**Manual deploy test command:**
```bash
cd _site && zip -r ../bundle.zip . && cd ..
curl -X POST -F "secret=YOUR_SECRET" -F "bundle=@bundle.zip" https://yourdomain.com/deployer.php
```

**Test via GitHub Actions (manual trigger):**
1. Go to https://github.com/heatloss/chimera-ssg/actions
2. Click "Build and Deploy Comic Site" → "Run workflow"
3. Fill in: comic_slug, comic_id, deploy_url, deploy_secret

## What's NOT Yet Implemented

### CMS Webhook Integration
The CMS needs to send `repository_dispatch` webhooks to trigger builds automatically.
Currently only manual dispatch has been tested.

### Social/Nav Links
Currently empty arrays in the data. The manifest doesn't include:
- `socialLinks` (Patreon, Bluesky, etc.)
- `navLinks` (Store, Extras, etc.)

These need to be added to the CMS manifest or fetched from a separate endpoint.

### RSS Feed
`src/feed.njk` exists but may need verification with live data.

## Commands

```bash
npm install        # Install dependencies
npm run build      # Build to _site/
npm start          # Dev server with hot reload
```

## Testing Locally

1. Ensure `.env` points to desired CMS (local or remote)
2. Run `npm run build` or `npm start`
3. Site builds at `_site/`

## Next Session Tasks

1. **CMS webhook integration** - Configure CMS to send `repository_dispatch` to GitHub
2. **Social/nav links** - Coordinate with CMS to include in manifest
3. **RSS feed verification** - Test with live data
4. **Theme system** (future) - Custom styling per comic
