/**
 * MySQL connection pool for the EC2-hosted cache.
 *
 * Reads MYSQL_URL from the environment, e.g.
 *   MYSQL_URL=mysql://shoebench:password@host:3306/shoebench
 *
 * The pool is created lazily on first call. Callers should use `getPool()`
 * for queries and `closePool()` at process exit.
 */

import * as mysql from 'mysql2/promise';

let pool: mysql.Pool | undefined;

export function getPool(): mysql.Pool {
  if (pool) return pool;

  const url = process.env.MYSQL_URL;
  if (!url) {
    throw new Error('MYSQL_URL is not set. Expected mysql://user:pass@host:port/db');
  }

  pool = mysql.createPool({
    uri: url,
    connectionLimit: 10,
    namedPlaceholders: false,
    dateStrings: true,
  });

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
