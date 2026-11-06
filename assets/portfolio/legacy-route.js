// Preserve existing page URLs while opening the shared portfolio layout.
(() => {
  const script = document.currentScript;
  const destination = new URL('../../index.html', script.src);
  destination.hash = `/${script.dataset.route}`;
  window.location.replace(destination.href);
})();
