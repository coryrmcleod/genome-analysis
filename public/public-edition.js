export const withheldLibraries = new Set([
  'pgs-library.json', 'pgs-populations.json', 'pgs-score-reference.json',
  'pgs-score-sensitivity.json', 'pgs-evaluation.json',
  'psychiatric-gwas-library.json', 'ancestry-reference.json',
  'ancestry-numerical-verification.json',
]);
export class LibraryNotIncludedError extends Error {
  constructor() { super('Not included in this public edition while reference-data permissions are reviewed.'); }
}
export function editionFetch(url, options) {
  const name = String(url).split('/').at(-1);
  if (withheldLibraries.has(name)) return Promise.reject(new LibraryNotIncludedError());
  return fetch(url, options);
}
