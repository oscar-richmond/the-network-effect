/**
 * @param {string} path
 */
export function asset(path) {
  const base = import.meta.env.BASE_URL;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${clean}`;
}

/**
 * @param {string} path
 */
export function withBase(path) {
  if (!path.startsWith('/')) return `${import.meta.env.BASE_URL}${path}`;
  return asset(path);
}
