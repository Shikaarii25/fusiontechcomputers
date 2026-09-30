import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const walk = async (dir, out=[]) => { for (const e of await readdir(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if (e.isDirectory() && !['node_modules','.git'].includes(e.name)) await walk(p,out); else if (e.isFile() && p.endsWith('.js')) out.push(p); } return out; };
const files = await walk('.');
for (const f of files) {
  const source = await readFile(f,'utf8');
  try { new Function(source.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+(default\s+)?/gm,'')); } catch (e) { console.error(`JS syntax check failed: ${f}\n${e.message}`); process.exit(1); }
}
console.log(`Checked ${files.length} JavaScript files for basic syntax.`);
