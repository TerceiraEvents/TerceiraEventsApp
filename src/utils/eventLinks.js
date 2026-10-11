export function eventIdFromUrl(value) {
  try {
    const url = new URL(value);
    if (!['https://eventosterceira.pt', 'https://www.eventosterceira.pt'].includes(url.origin) && url.protocol !== 'terceiraevents:') return null;
    if (!/^\/(?:pt\/)?events\/?$/.test(url.pathname) && !(url.protocol === 'terceiraevents:' && url.hostname === 'events')) return null;
    const id = url.searchParams.get('id');
    return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
  } catch { return null; }
}
