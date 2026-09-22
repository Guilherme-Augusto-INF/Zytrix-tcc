export function sortLives(items = []) {
  return [...items].sort((a, b) => {
    const viewers = Number(b.viewerCount || 0) - Number(a.viewerCount || 0);
    return viewers || String(a.id || '').localeCompare(String(b.id || ''));
  });
}

export function splitHomeLives(items = []) {
  const ordered = sortLives(items);
  return {
    ordered,
    featured: ordered.slice(0, 3),
    liveNow: ordered.slice(3, 7)
  };
}
