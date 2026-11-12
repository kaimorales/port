// The preview exposes the same static surface as the GitHub Pages site.
const pages = new Set([
  '/index.html', '/about.html', '/experience.html', '/projects.html',
  '/contact.html', '/driving-school.html', '/pit-wall.html', '/conversation-study.html',
]);

export function isPublicFile(path) {
  if (pages.has(path)) return true;
  if (/^\/projects\/[a-z0-9][a-z0-9_-]*\.html$/i.test(path)) return true;
  return /^\/assets\/(?:[a-z0-9][a-z0-9_-]*\/)+[a-z0-9][a-z0-9._-]*\.(?:css|js|mjs|jpg|jpeg|png|svg|webp|ico|json)$/i.test(path);
}
