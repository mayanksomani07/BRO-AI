/**
 * expo-sqlite IN-MEMORY MOCK + AsyncStorage persistence for Expo Go
 *
 * FIXES: XP staying at 0 — DB was resetting on every app restart.
 * Now persists to AsyncStorage so XP/tasks survive reloads.
 *
 * Supports: INSERT (OR REPLACE / OR IGNORE), SELECT, UPDATE (col = col + ?), DELETE
 *           WHERE, ORDER BY, LIMIT, COUNT(*), SUM(), multi-arg transactions
 */

type SQLValue = string | number | null;

interface SQLResultSet {
  insertId: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (i: number) => Record<string, SQLValue>;
    _array: Record<string, SQLValue>[];
  };
}

type SQLSuccessCallback = (tx: MockTransaction, result: SQLResultSet) => void;
type SQLErrorCallback   = (tx: MockTransaction, error: Error) => boolean;
type TxCallback        = (tx: MockTransaction) => void;
type TxErrorCallback   = (error: Error) => void;
type TxSuccessCallback = () => void;

function makeRows(arr: Record<string, SQLValue>[]): SQLResultSet['rows'] {
  return { length: arr.length, item: (i) => arr[i] ?? {}, _array: arr };
}
function emptyResult(rowsAffected = 0): SQLResultSet {
  return { insertId: 0, rowsAffected, rows: makeRows([]) };
}

function parseWhere(wherePart: string, args: SQLValue[], rows: Record<string, SQLValue>[]): Record<string, SQLValue>[] {
  const conditions = wherePart.split(/ AND /i).map(c => c.trim());
  let argIndex = 0;
  return rows.filter(row => {
    let ai = argIndex;
    for (const cond of conditions) {
      // ── Placeholder conditions (consume one arg) ──
      if (cond.includes('?')) {
        const argVal = args[ai++];
        if      (/(\w+)\s*>=\s*\?/i.test(cond)) { const col = cond.match(/(\w+)/)?.[1]!; if (!((row[col] ?? 0) >= (argVal ?? 0))) return false; }
        else if (/(\w+)\s*<=\s*\?/i.test(cond)) { const col = cond.match(/(\w+)/)?.[1]!; if (!((row[col] ?? 0) <= (argVal ?? 0))) return false; }
        else if (/(\w+)\s*<\s*\?/i.test(cond))  { const col = cond.match(/(\w+)/)?.[1]!; if (!((row[col] ?? 0) <  (argVal ?? 0))) return false; }
        else if (/(\w+)\s*>\s*\?/i.test(cond))  { const col = cond.match(/(\w+)/)?.[1]!; if (!((row[col] ?? 0) >  (argVal ?? 0))) return false; }
        else if (/(\w+)\s*=\s*\?/i.test(cond))  { const col = cond.match(/(\w+)/)?.[1]!; if (row[col] !== argVal) return false; }
      }
      // ── Literal conditions (no arg consumed) e.g. completed = 1 ──
      else if (/(\w+)\s+IS\s+NULL/i.test(cond)) {
        const col = cond.match(/(\w+)/)?.[1]!;
        if (row[col] !== null) return false;
      }
      else if (/(\w+)\s+IS\s+NOT\s+NULL/i.test(cond)) {
        const col = cond.match(/(\w+)/)?.[1]!;
        if (row[col] === null) return false;
      }
      else {
        // col = literal_value (e.g. completed = 1, role = 'user')
        const litM = cond.match(/(\w+)\s*([><=!]+)\s*'?([^']+)'?/i);
        if (litM) {
          const [, col, op, rawVal] = litM;
          const litVal: SQLValue = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
          if (op === '='  && row[col] !== litVal)                   return false;
          if (op === '!=' && row[col] === litVal)                   return false;
          if (op === '>'  && !((row[col] ?? 0) > (litVal as any)))  return false;
          if (op === '>=' && !((row[col] ?? 0) >= (litVal as any))) return false;
          if (op === '<'  && !((row[col] ?? 0) < (litVal as any)))  return false;
          if (op === '<=' && !((row[col] ?? 0) <= (litVal as any))) return false;
        }
      }
    }
    argIndex = ai;
    return true;
  });
}

function executeSQL(tables: Record<string, Record<string, SQLValue>[]>, sql: string, args: SQLValue[]): SQLResultSet {
  const s = sql.trim().replace(/\s+/g, ' ');
  const u = s.toUpperCase();

  if (u.startsWith('PRAGMA')) return emptyResult();

  if (u.startsWith('CREATE TABLE')) {
    const m = s.match(/CREATE TABLE IF NOT EXISTS (\w+)/i) ?? s.match(/CREATE TABLE (\w+)/i);
    if (m && !tables[m[1]]) tables[m[1]] = [];
    return emptyResult();
  }

  if (u.startsWith('INSERT')) {
    const m = s.match(/INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!m) return emptyResult();
    const [, tableName, colsPart, valsPart] = m;
    if (!tables[tableName]) tables[tableName] = [];
    const cols = colsPart.split(',').map(c => c.trim());
    // Parse VALUES — handle both '?' placeholders AND literal values ('text', 123, NULL)
    const rawVals = valsPart.split(',').map(v => v.trim());
    let argIdx = 0;
    const row: Record<string, SQLValue> = {};
    cols.forEach((col, i) => {
      const v = rawVals[i] ?? '?';
      if (v === '?') {
        row[col] = args[argIdx++] ?? null;
      } else if (/^NULL$/i.test(v)) {
        row[col] = null;
      } else if (/^'(.*)'$/.test(v)) {
        row[col] = v.slice(1, -1);            // strip single quotes
      } else if (!isNaN(Number(v))) {
        row[col] = Number(v);                  // numeric literal
      } else {
        row[col] = args[argIdx++] ?? null;     // unknown — consume arg
      }
    });
    if (u.includes('OR REPLACE')) {
      const pkCol = cols[0];
      const idx = tables[tableName].findIndex(r => r[pkCol] === row[pkCol]);
      if (idx >= 0) { tables[tableName][idx] = row; return emptyResult(1); }
    } else if (u.includes('OR IGNORE')) {
      const pkCol = cols[0];
      if (tables[tableName].some(r => r[pkCol] === row[pkCol])) return emptyResult(0);
    }
    tables[tableName].push(row);
    return emptyResult(1);
  }

  if (u.startsWith('SELECT')) {
    const fromM = s.match(/FROM (\w+)/i);
    if (!fromM) return emptyResult();
    const tableName = fromM[1];
    let data = [...(tables[tableName] ?? [])];
    const whereM = s.match(/WHERE (.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    let whereArgCount = 0;
    if (whereM) {
      whereArgCount = (whereM[1].match(/\?/g) ?? []).length;
      data = parseWhere(whereM[1].trim(), args.slice(0, whereArgCount), data);
    }
    const restArgs = args.slice(whereArgCount);
    const orderM = s.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
    if (orderM) {
      const [, col, dir = 'ASC'] = orderM;
      data.sort((a, b) => {
        const av = a[col] ?? 0, bv = b[col] ?? 0;
        return dir.toUpperCase() === 'ASC' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
      });
    }
    const limitM = s.match(/LIMIT (\?|\d+)/i);
    if (limitM) {
      const val = limitM[1] === '?' ? Number(restArgs[0]) : Number(limitM[1]);
      data = data.slice(0, val);
    }
    if (u.includes('COUNT(*)')) {
      const alias = s.match(/COUNT\(\*\)\s+(?:AS\s+)?(\w+)/i)?.[1] ?? 'count';
      return { insertId: 0, rowsAffected: 0, rows: makeRows([{ [alias]: data.length }]) };
    }
    const sumM = s.match(/SUM\((\w+)\)\s+(?:AS\s+)?(\w+)/i);
    if (sumM) {
      const [, col, alias] = sumM;
      const total = data.reduce((acc, r) => acc + Number(r[col] ?? 0), 0);
      return { insertId: 0, rowsAffected: 0, rows: makeRows([{ [alias]: total }]) };
    }
    const colsM = s.match(/^SELECT (.+?) FROM/i);
    const colsPart = colsM?.[1] ?? '*';
    if (colsPart.trim() !== '*') {
      const selectedCols = colsPart.split(',').map(c => c.trim());
      data = data.map(row => {
        const out: Record<string, SQLValue> = {};
        selectedCols.forEach(col => { out[col] = row[col] ?? null; });
        return out;
      });
    }
    return { insertId: 0, rowsAffected: 0, rows: makeRows(data) };
  }

  if (u.startsWith('UPDATE')) {
    const m = s.match(/UPDATE (\w+) SET (.+?)(?:\s+WHERE (.+))?$/i);
    if (!m) return emptyResult();
    const [, tableName, setPart, wherePart] = m;
    if (!tables[tableName]) return emptyResult();
    const assignments: { col: string; type: 'set' | 'add'; argIdx: number }[] = [];
    let setArgIdx = 0;
    const setParts = setPart.split(/,(?![^()]*\))/);
    for (const part of setParts) {
      const addM = part.match(/(\w+)\s*=\s*\w+\s*\+\s*\?/i);
      const eqM  = part.match(/(\w+)\s*=\s*\?/i);
      if (addM) assignments.push({ col: addM[1], type: 'add', argIdx: setArgIdx++ });
      else if (eqM) assignments.push({ col: eqM[1], type: 'set', argIdx: setArgIdx++ });
    }
    const setArgs   = args.slice(0, setArgIdx);
    const whereArgs = args.slice(setArgIdx);
    let rowsAffected = 0;
    tables[tableName] = tables[tableName].map(row => {
      const matches = !wherePart || parseWhere(wherePart.trim(), whereArgs, [row]).length > 0;
      if (!matches) return row;
      rowsAffected++;
      const updated = { ...row };
      for (const { col, type, argIdx } of assignments) {
        if (type === 'add') updated[col] = Number(updated[col] ?? 0) + Number(setArgs[argIdx] ?? 0);
        else                updated[col] = setArgs[argIdx] ?? null;
      }
      return updated;
    });
    return emptyResult(rowsAffected);
  }

  if (u.startsWith('DELETE')) {
    const m = s.match(/DELETE FROM (\w+)(?:\s+WHERE (.+))?$/i);
    if (!m) return emptyResult();
    const [, tableName, wherePart] = m;
    if (!tables[tableName]) return emptyResult();
    const before = tables[tableName].length;
    if (wherePart) {
      tables[tableName] = tables[tableName].filter(row => parseWhere(wherePart.trim(), args, [row]).length === 0);
    } else {
      tables[tableName] = [];
    }
    return emptyResult(before - tables[tableName].length);
  }

  return emptyResult();
}

class MockTransaction {
  constructor(private tables: Record<string, Record<string, SQLValue>[]>, private ops: Array<() => void>) {}
  executeSql(sql: string, args: SQLValue[] = [], successCb?: SQLSuccessCallback, _errorCb?: SQLErrorCallback) {
    this.ops.push(() => {
      try {
        const result = executeSQL(this.tables, sql, args);
        successCb?.(this, result);
      } catch { /* ignore */ }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MockDatabase with AsyncStorage persistence
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_PREFIX = 'bromood_sqlite_v3_';

class MockDatabase {
  private tables: Record<string, Record<string, SQLValue>[]> = {};
  private isLoaded = false;
  private pendingOps: Array<() => void> = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private dbName: string) {
    this.loadFromStorage();
  }

  private async loadFromStorage() {
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      const saved = await AS.getItem(STORAGE_PREFIX + this.dbName);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.tables = parsed;
        }
      }
    } catch { /* fall back to in-memory only */ }
    this.isLoaded = true;
    const pending = [...this.pendingOps];
    this.pendingOps = [];
    pending.forEach(op => op());
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      try {
        const AS = require('@react-native-async-storage/async-storage').default;
        await AS.setItem(STORAGE_PREFIX + this.dbName, JSON.stringify(this.tables));
      } catch { /* ignore */ }
    }, 150);
  }

  transaction(cb: TxCallback, errCb?: TxErrorCallback, okCb?: TxSuccessCallback) {
    const run = () => {
      const ops: Array<() => void> = [];
      const tx = new MockTransaction(this.tables, ops);
      try {
        cb(tx);
        ops.forEach(op => op());
        this.scheduleSave();
        okCb?.();
      } catch (e) {
        errCb?.(e as Error);
      }
    };
    if (this.isLoaded) run();
    else this.pendingOps.push(run);
  }
}

const dbCache: Record<string, MockDatabase> = {};
export function openDatabase(name: string): MockDatabase {
  if (!dbCache[name]) dbCache[name] = new MockDatabase(name);
  return dbCache[name];
}
export default { openDatabase };