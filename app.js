// Preserve bookmarks to the old single-page portfolio. Navigation itself is HTML.
(() => {
  const section = window.location.hash.slice(1);
  const pages = new Map([
    ['projects', 'projects.html'],
    ['experience', 'experience.html'],
    ['about', 'about.html'],
    ['contact', 'contact.html'],
  ]);
  if (pages.has(section)) {
    window.location.replace(new URL(pages.get(section), window.location.href).href);
  }
})();
