import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

type AppSql = NeonQueryFunction<false, false>;

let client: AppSql | undefined;

function getSqlClient(): AppSql {
  if (client) {
    return client;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when a database query is executed.');
  }

  client = neon(databaseUrl);
  return client;
}

const lazySqlTarget = ((strings: TemplateStringsArray, ...params: unknown[]) =>
  getSqlClient()(strings, ...params)) as AppSql;

const lazyQuery = ((...args: Parameters<AppSql['query']>) =>
  getSqlClient().query(...args)) as AppSql['query'];
const lazyUnsafe = ((rawSql: string) => getSqlClient().unsafe(rawSql)) as AppSql['unsafe'];
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
    if (property === 'unsafe') {
      return lazyUnsafe;
    }
    if (property === 'transaction') {
      return lazyTransaction;
    }
    return undefined;
  },
}) as AppSql;

export const db = drizzle(sql, { schema });

export type Database = typeof db;
