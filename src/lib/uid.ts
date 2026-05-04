export function uid(): string {
  if (typeof crypto !== 'undefined') {
    const c = crypto as Crypto;
    if (typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
    if (typeof c.getRandomValues === 'function') {
      const buf = new Uint8Array(8);
      c.getRandomValues(buf);
      return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
