/**
 * Search utility for cross-database compatibility.
 *
 * SQLite's `contains` filter is always case-insensitive by default,
 * but doesn't support `mode: 'insensitive'` — passing it causes a
 * runtime "Unknown argument `mode`" error.
 *
 * PostgreSQL's `contains` filter is case-sensitive by default,
 * and requires `mode: 'insensitive'` for case-insensitive search.
 *
 * This utility detects the active database provider from DATABASE_URL
 * and builds the correct filter shape for each.
 */

const DATABASE_URL = process.env.DATABASE_URL || '';
const IS_POSTGRES = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://');

/**
 * Build a Prisma `contains` filter that works on both SQLite and PostgreSQL.
 *
 * In SQLite (dev): `contains: search` — case-insensitive by default, no mode.
 * In PostgreSQL (prod): `contains: search, mode: 'insensitive'`.
 */
export function containsInsensitive(search: string): { contains: string; mode?: 'insensitive' } {
  if (IS_POSTGRES) {
    return { contains: search, mode: 'insensitive' };
  }
  // SQLite — omit mode entirely (runtime error if included)
  return { contains: search };
}

/**
 * Build a Prisma `contains` filter for tag/category fields.
 * Same as `containsInsensitive` but named differently for clarity
 * when searching comma-separated tag fields.
 */
export function tagContainsInsensitive(search: string): { contains: string; mode?: 'insensitive' } {
  return containsInsensitive(search);
}
