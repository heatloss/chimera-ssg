/**
 * Mobile Navigation Toggle
 */
(function() {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function() {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      siteNav.classList.toggle('is-open');
    });

    // Close nav when clicking outside
    document.addEventListener('click', function(e) {
      if (!siteNav.contains(e.target) && !navToggle.contains(e.target)) {
        navToggle.setAttribute('aria-expanded', 'false');
        siteNav.classList.remove('is-open');
      }
    });
  }
})();

/**
 * Keyboard Navigation for Comic Pages
 * Arrow keys: Left = Previous, Right = Next
 */
(function() {
  const prevLink = document.querySelector('.nav-prev:not(.disabled)');
  const nextLink = document.querySelector('.nav-next:not(.disabled)');

  if (prevLink || nextLink) {
    document.addEventListener('keydown', function(e) {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft' && prevLink) {
        prevLink.click();
      } else if (e.key === 'ArrowRight' && nextLink) {
        nextLink.click();
      }
    });
  }
})();

/**
 * Content Warning Reveal
 */
(function() {
  document.addEventListener('click', function(e) {
    var revealBtn = e.target.closest('.content-warning-reveal');
    if (revealBtn) {
      revealBtn.closest('.comic-area').classList.add('revealed');
    }
  });
})();
