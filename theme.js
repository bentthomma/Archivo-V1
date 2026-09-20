/* Only presentation preferences are persisted. Never opens the live archive. */
(() => {
  let preference = 'system';
  try { preference = localStorage.getItem('archivio-m2-theme') || preference; } catch {}
  if (!['light','dark','system'].includes(preference)) preference = 'system';
  document.documentElement.dataset.theme = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  window.ARCHIVIO_THEME = preference;
})();
