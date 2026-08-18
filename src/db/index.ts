import { neon, neonConfig, Pool, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import WebSocket from 'ws';

import { resolveRuntimeDatabaseUrl } from '@/lib/db/runtime-config';

import * as schema from './schema';

type AppSql = NeonQueryFunction<false, false>;

type AppDatabase = ReturnType<typeof createDatabase>;

let client: AppSql | undefined;
let pool: Pool | undefined;
let database: AppDatabase | undefined;

function getRuntimeDatabaseUrl() {
  return resolveRuntimeDatabaseUrl();
}

function getSqlClient(): AppSql {
  if (client) {
    return client;
  }

  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_RUNTIME or DATABASE_URL is required when a database query is executed.');
  }

  client = neon(databaseUrl);
  return client;
}

function getDatabasePool() {
  if (pool) {
    return pool;
  }

  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_RUNTIME or DATABASE_URL is required when a database query is executed.');
  }

  // Vercel production uses Node 24, but local development and CI may use an
  // older Node runtime without a global WebSocket implementation. The
  // serverless Pool is required by Drizzle for interactive transactions.
  neonConfig.webSocketConstructor ??= WebSocket;
  pool = new Pool({ connectionString: databaseUrl, max: 1 });
  pool.on('error', (error: unknown) => {
    console.error('[db] Neon pool error', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
  });
  return pool;
}

function createDatabase() {
  return drizzle(getDatabasePool(), { schema });
}

function getDatabase() {
  database ??= createDatabase();
  return database;
}

const lazySqlTarget = ((strings: TemplateStringsArray, ...params: unknown[]) =>
  getSqlClient()(strings, ...params)) as AppSql;

const lazyQuery = ((...args: Parameters<AppSql['query']>) =>
  getSqlClient().query(...args)) as AppSql['query'];
const lazyTransaction = ((...args: Parameters<AppSql['transaction']>) =>
  getSqlClient().transaction(...args)) as AppSql['transaction'];

/**
 * Lazy Neon SQL helper. Importing this module is safe without DATABASE_URL;
 * the missing-variable error is raised only when the helper is used.
 */
export const sql = new Proxy(lazySqlTarget, {
  apply(_target, thisArg, argArray) {
    return Reflect.apply(getSqlClient(), thisArg, argArray);
  },
  get(_target, property) {
    if (property === 'query') {
      return lazyQuery;
    }
    if (property === 'transaction') {
      return lazyTransaction;
    }
    return undefined;
  },
}) as AppSql;

// Keep the database lazy so unit tests and public routes can import server
// modules without requiring DATABASE_URL during module evaluation. Methods
// are bound to the concrete Drizzle instance so transactions work normally.
export const db = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const target = getDatabase();
    const value = Reflect.get(target, property, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

export type Database = typeof db;
