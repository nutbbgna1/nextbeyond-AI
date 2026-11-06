import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function storeDir(sub: string): string {
  const p = path.join(DATA_DIR, sub);
  ensureDir(p);
  return p;
}

export function storeGet(sub: string, name: string): string | null {
  try {
    const filePath = path.join(storeDir(sub), name);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error(`storeGet error for ${sub}/${name}:`, err);
  }
  return null;
}

export function storeGetBuffer(sub: string, name: string): Buffer | null {
  try {
    const filePath = path.join(storeDir(sub), name);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (err) {
    console.error(`storeGetBuffer error for ${sub}/${name}:`, err);
  }
  return null;
}

export function storePut(sub: string, name: string, data: string | Buffer): void {
  try {
    const dir = storeDir(sub);
    const filePath = path.join(dir, name);
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, data);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`storePut error for ${sub}/${name}:`, err);
    throw err;
  }
}

export function storeDel(sub: string, name: string): void {
  try {
    const filePath = path.join(storeDir(sub), name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`storeDel error for ${sub}/${name}:`, err);
  }
}

export function storeHas(sub: string, name: string): boolean {
  try {
    const filePath = path.join(storeDir(sub), name);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function storeList(sub: string, pattern: string = '*'): Record<string, { mtime: number; size: number }> {
  const result: Record<string, { mtime: number; size: number }> = {};
  try {
    const dir = storeDir(sub);
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('.tmp')) continue;
      if (pattern !== '*' && pattern.startsWith('*.')) {
        const ext = pattern.slice(1);
        if (!f.endsWith(ext)) continue;
      }
      try {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        if (st.isFile()) {
          result[f] = { mtime: Math.floor(st.mtimeMs / 1000), size: st.size };
        }
      } catch {}
    }
  } catch (err) {
    console.error(`storeList error for ${sub}:`, err);
  }
  return result;
}

export function storeJsonGet<T = any>(sub: string, name: string): T | null {
  const text = storeGet(sub, name);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function storeJsonPut(sub: string, name: string, data: any): void {
  const json = JSON.stringify(data, null, 2);
  storePut(sub, name, json);
}
