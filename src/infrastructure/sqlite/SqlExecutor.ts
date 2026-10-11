export type SqlParam = string | number | null;

/**
 * The two queries the repository needs. Keeping the repository on this tiny interface
 * (instead of a specific SQLite library) lets it run on the phone and in Node tests alike.
 */
export interface SqlExecutor {
  all<T>(sql: string, params?: readonly SqlParam[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlParam[]): Promise<T | null>;
}
