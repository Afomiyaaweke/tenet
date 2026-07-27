/**
 * Search utility for cross-database compatibility.
 *
 * SQLite's `contains` filter is always case-insensitive by default,
 * but doesn't support `mode: 'insensitive'` in Prisma types.
 *
 * PostgreSQL's `contains` filter is case-sensitive by default,
 * and requires `mode: 'insensitive'` for case-insensitive search.
 *
 * This utility provides a helper to build contains filters that work
 * on BOTH databases: SQLite (dev) and PostgreSQL (production/Vercel).
 *
 * For production deployment supporting 2000 users, all search queries
 * MUST use this utility to ensure consistent behavior.
 */

/**
 * Build a Prisma `contains` filter that works on both SQLite and PostgreSQL.
 *
 * In SQLite: `contains: search` (case-insensitive by default, no mode needed)
 * In PostgreSQL: `contains: search, mode: 'insensitive'` (explicit case-insensitive)
 *
 * Since the SQLite Prisma client types don't include `mode`,
 * we use a type assertion to make it compatible at the TypeScript level.
 * At runtime, SQLite ignores the `mode` parameter (it's always case-insensitive),
 * while PostgreSQL uses it to enable case-insensitive search.
 */
export function containsInsensitive(search: string): { contains: string; mode?: 'insensitive' } {
  // Type assertion needed for SQLite client compatibility
  // PostgreSQL client includes `mode` in StringFilter types
  // SQLite client does not — but runtime behavior is correct on both
  return { contains: search, mode: 'insensitive' } as { contains: string };
}

/**
 * Build a Prisma `contains` filter for tag/category fields.
 * Same as `containsInsensitive` but named differently for clarity
 * when searching comma-separated tag fields.
 */
export function tagContainsInsensitive(search: string): { contains: string; mode?: 'insensitive' } {
  return containsInsensitive(search);
}
