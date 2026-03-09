/**
 * expo-sqlite IN-MEMORY MOCK for Expo Go testing
 *
 * expo-sqlite's native .js files (build/SQLite.js) don't exist in the npm
 * package — they're generated during a native Xcode/Android build.
 * Expo Go already has SQLite built natively on the device, but Metro's
 * Node process crashes trying to resolve the missing JS file.
 *
 * This mock implements the full expo-sqlite v13 WebSQL API in-memory,
 * so ALL screens, stores, and queries work identically during testing.
 * Data persists for the whole app session (resets on app restart — fine for testing).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type SQLValue = string | number | null;

interface SQLResultSet {
  insertId: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => Record<string, SQLValue>;
    _array: Record<string, SQLValue>[];
  };
}

type SQLSuccessCallback = (tx: MockTransaction, result: SQLResultSet) => void;
type SQLErrorCallback = (tx: MockTransaction, error: Error) => boolean;
type TxCallback = (tx: MockTransaction) => void;
type TxErrorCallback = (error: Error) => void;
type TxSuccessCallback = () => void;

// ─── Simple SQL Parser ────────────────────────────────────────────────────────

function makeRows(arr: Record<string, SQLValue>[]): SQLResultSet['rows'] {
  return {
    length: arr.length,
    item: (i: number) => arr[i] ?? {},
    _array: arr,
  };
}

function emptyResult(rowsAffected = 0): SQLResultSet {
  return { insertId: 0, rowsAffected, rows: makeRows([]) };
}

// Very simple SQL executor — handles the exact queries BroMood uses
function executeSQLOnTables(
  tables: Record<string, Record<string, SQLValue>[]>,
  sql: string,
  args: SQLValue[]
): SQLResultSet {
  const s = sql.trim().replace(/\s+/g, ' ');
  const upper = s.toUpperCase();

  // ── PRAGMA (ignore) ──────────────────────────────────────────────────────
  if (upper.startsWith('PRAGMA')) return emptyResult();

  // ── CREATE TABLE IF NOT EXISTS ────────────────────────────────────────────
  if (upper.startsWith('CREATE TABLE IF NOT EXISTS')) {
    const match = s.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (match) {
      const name = match[1];
      if (!tables[name]) tables[name] = [];
    }
    return emptyResult();
  }

  // ── INSERT OR IGNORE / INSERT OR REPLACE / INSERT INTO ────────────────────
  if (upper.startsWith('INSERT')) {
    const tableMatch = s.match(/INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!tableMatch) return emptyResult();
    const [, tableName, colsPart] = tableMatch;
    if (!tables[tableName]) tables[tableName] = [];

    const cols = colsPart.split(',').map(c => c.trim());
    const row: Record<string, SQLValue> = {};
    cols.forEach((col, i) => { row[col] = args[i] ?? null; });

    const isReplace = upper.includes('OR REPLACE');
    const isIgnore = upper.includes('OR IGNORE');

    if (isReplace || isIgnore) {
      const pkCol = cols[0]; // assume first col is PK
      const pkVal = row[pkCol];
      const existingIdx = tables[tableName].findIndex(r => r[pkCol] === pkVal);
      if (existingIdx >= 0) {
        if (isReplace) tables[tableName][existingIdx] = row;
        // if isIgnore: do nothing
        return emptyResult(isReplace ? 1 : 0);
      }
    }

    tables[tableName].push(row);
    return emptyResult(1);
  }

  // ── SELECT ────────────────────────────────────────────────────────────────
  if (upper.startsWith('SELECT')) {
    // Extract table name
    const fromMatch = s.match(/FROM (\w+)/i);
    if (!fromMatch) return emptyResult();
    const tableName = fromMatch[1];
    const tableData = tables[tableName] ?? [];

    // Parse WHERE clause
    let filtered = [...tableData];
    const whereMatch = s.match(/WHERE (.+?)(?:ORDER|LIMIT|$)/i);
    if (whereMatch) {
      filtered = applyWhere(filtered, whereMatch[1].trim(), args);
    }

    // ORDER BY
    const orderMatch = s.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = (orderMatch[2] ?? 'ASC').toUpperCase();
      filtered.sort((a, b) => {
        const av = a[col] ?? 0, bv = b[col] ?? 0;
        if (av < bv) return dir === 'ASC' ? -1 : 1;
        if (av > bv) return dir === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // LIMIT
    const limitMatch = s.match(/LIMIT (\?|\d+)/i);
    if (limitMatch) {
      const limitVal = limitMatch[1] === '?'
        ? Number(args[args.length - 1])
        : Number(limitMatch[1]);
      filtered = filtered.slice(0, limitVal);
    }

    // COUNT(*)
    if (upper.includes('COUNT(*)')) {
      const alias = s.match(/COUNT\(\*\)\s+(?:AS\s+)?(\w+)/i)?.[1] ?? 'count';
      return { insertId: 0, rowsAffected: 0, rows: makeRows([{ [alias]: filtered.length }]) };
    }

    // SELECT specific columns vs *
    const colsMatch = s.match(/^SELECT (.+?) FROM/i);
    const colsPart = colsMatch?.[1] ?? '*';
    if (colsPart.trim() !== '*') {
      const selectedCols = colsPart.split(',').map(c => c.trim());
      filtered = filtered.map(row => {
        const out: Record<string, SQLValue> = {};
        selectedCols.forEach(col => { out[col] = row[col] ?? null; });
        return out;
      });
    }

    return { insertId: 0, rowsAffected: 0, rows: makeRows(filtered) };
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  if (upper.startsWith('UPDATE')) {
    const tableMatch = s.match(/UPDATE (\w+) SET (.+?)(?:WHERE (.+))?$/i);
    if (!tableMatch) return emptyResult();
    const [, tableName, setPart, wherePart] = tableMatch;
    if (!tables[tableName]) return emptyResult();

    // Parse SET assignments
    const assignments = parseSetClause(setPart, args);
    let setArgCount = Object.keys(assignments).length;
    const whereArgs = args.slice(setArgCount);

    let rowsAffected = 0;
    tables[tableName] = tables[tableName].map(row => {
      if (!wherePart || matchesWhere(row, wherePart.trim(), whereArgs)) {
        rowsAffected++;
        return { ...row, ...assignments };
      }
      return row;
    });

    return emptyResult(rowsAffected);
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (upper.startsWith('DELETE')) {
    const tableMatch = s.match(/DELETE FROM (\w+)(?:\s+WHERE (.+))?$/i);
    if (!tableMatch) return emptyResult();
    const [, tableName, wherePart] = tableMatch;
    if (!tables[tableName]) return emptyResult();

    const before = tables[tableName].length;
    if (wherePart) {
      tables[tableName] = tables[tableName].filter(
        row => !matchesWhere(row, wherePart.trim(), args)
      );
    } else {
      tables[tableName] = [];
    }
    return emptyResult(before - tables[tableName].length);
  }

  // Unknown — ignore silently
  return emptyResult();
}

// ─── WHERE clause helpers ─────────────────────────────────────────────────────

function applyWhere(
  rows: Record<string, SQLValue>[],
  wherePart: string,
  args: SQLValue[]
): Record<string, SQLValue>[] {
  return rows.filter(row => matchesWhere(row, wherePart, args));
}

let _argIndex = 0;
function matchesWhere(
  row: Record<string, SQLValue>,
  wherePart: string,
  args: SQLValue[]
): boolean {
  // Handle: col = ?, col >= ?, col < ?, col IS NULL
  _argIndex = 0;
  const conditions = wherePart.split(/ AND /i);
  for (const cond of conditions) {
    const argVal = args[_argIndex];
    _argIndex++;

    const geMatch = cond.match(/(\w+)\s*>=\s*\?/i);
    const leMatch = cond.match(/(\w+)\s*<=\s*\?/i);
    const ltMatch = cond.match(/(\w+)\s*<\s*\?/i);
    const gtMatch = cond.match(/(\w+)\s*>\s*\?/i);
    const eqMatch = cond.match(/(\w+)\s*=\s*\?/i);
    const nullMatch = cond.match(/(\w+)\s+IS\s+NULL/i);

    if (geMatch) { if (!((row[geMatch[1]] ?? 0) >= (argVal ?? 0))) return false; }
    else if (leMatch) { if (!((row[leMatch[1]] ?? 0) <= (argVal ?? 0))) return false; }
    else if (ltMatch) { if (!((row[ltMatch[1]] ?? 0) < (argVal ?? 0))) return false; }
    else if (gtMatch) { if (!((row[gtMatch[1]] ?? 0) > (argVal ?? 0))) return false; }
    else if (eqMatch) { if (row[eqMatch[1]] !== argVal) return false; }
    else if (nullMatch) { if (row[nullMatch[1]] !== null) return false; }
  }
  return true;
}

function parseSetClause(
  setPart: string,
  args: SQLValue[]
): Record<string, SQLValue> {
  const result: Record<string, SQLValue> = {};
  // Handle "col = ?, col = col + ?" etc.
  const parts = setPart.split(',');
  let argIdx = 0;
  for (const part of parts) {
    const addMatch = part.match(/(\w+)\s*=\s*\w+\s*\+\s*\?/i);
    const eqMatch = part.match(/(\w+)\s*=\s*\?/i);
    if (addMatch) {
      // col = col + ? — skip in parse (handled at update time, just reserve arg slot)
      result[`__add_${addMatch[1]}`] = args[argIdx++] ?? 0;
    } else if (eqMatch) {
      result[eqMatch[1]] = args[argIdx++] ?? null;
    }
  }
  return result;
}

// ─── Mock Transaction ─────────────────────────────────────────────────────────

class MockTransaction {
  constructor(
    private tables: Record<string, Record<string, SQLValue>[]>,
    private pendingOps: Array<() => void>
  ) {}

  executeSql(
    sql: string,
    args: SQLValue[] = [],
    successCb?: SQLSuccessCallback,
    _errorCb?: SQLErrorCallback
  ) {
    this.pendingOps.push(() => {
      try {
        const result = executeSQLOnTables(this.tables, sql, args);
        successCb?.(this, result);
      } catch (err) {
        // Silently ignore — let transaction succeed
      }
    });
  }
}

// ─── Mock Database ────────────────────────────────────────────────────────────

class MockDatabase {
  private tables: Record<string, Record<string, SQLValue>[]> = {};

  transaction(
    callback: TxCallback,
    errorCb?: TxErrorCallback,
    successCb?: TxSuccessCallback
  ) {
    const pendingOps: Array<() => void> = [];
    const tx = new MockTransaction(this.tables, pendingOps);
    try {
      callback(tx);
      // Execute all queued ops synchronously
      for (const op of pendingOps) op();
      successCb?.();
    } catch (err) {
      errorCb?.(err as Error);
    }
  }
}

// ─── Cache: one DB instance per name ─────────────────────────────────────────

const dbCache: Record<string, MockDatabase> = {};

export function openDatabase(name: string): MockDatabase {
  if (!dbCache[name]) dbCache[name] = new MockDatabase();
  return dbCache[name];
}

export default { openDatabase };