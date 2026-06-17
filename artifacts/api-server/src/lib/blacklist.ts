export const tokenBlacklist = new Set<string>();

export function addToBlacklist(token: string) {
  tokenBlacklist.add(token);
}

export function isBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}
