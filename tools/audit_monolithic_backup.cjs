// ONE-OFF, READ-ONLY: answer MASTER_DESIGN §22.3's blocking question —
// "is isolate/game2_backup_monolithic.html recoverable?" — before cleanup.
//
// Deletion is SAFE iff: for every snapshot of public/game2.html in git
// history AND the current working tree, any content NOT present in the
// monolithic backup still exists elsewhere (current file or other history).
// Concretely: unique lines of each snapshot that survive nowhere else must
// be empty (ignoring pure metadata churn). Conservative: we report the
// line-level delta and only green-light when unique content is limited to
// trivially-regenerable things (build ids, timestamps, hashes).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GIT = path.join(process.cwd(), '.git');
const BACKUP = process.argv[2] || 'isolate/game2_backup_monolithic.html';
const TARGET = 'public/game2.html';

function readRefFile(ref) {
  const p = path.join(GIT, ref);
  if (fs.existsSync(p)) {
    const s = fs.readFileSync(p, 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(s)) return s;
    if (s.startsWith('ref:')) return readRefFile(s.slice(4).trim());
  }
  return null;
}
function packedRefs() {
  const p = path.join(GIT, 'packed-refs');
  const out = {};
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([0-9a-f]{40}) (refs\/.+)$/);
      if (m) out[m[2]] = m[1];
    }
  }
  return out;
}
const packsDir = path.join(GIT, 'objects', 'pack');
const packFiles = fs.existsSync(packsDir) ? fs.readdirSync(packsDir).filter((f) => f.endsWith('.pack')).map((f) => path.join(packsDir, f)) : [];
function parseIdx(idxPath) {
  const buf = fs.readFileSync(idxPath);
  if (buf.readUInt32BE(0) !== 0xff744f63) return null;
  const nObjects = buf.readUInt32BE(8 + 255 * 4);
  const shaBase = 8 + 256 * 4;
  const shas = [];
  for (let i = 0; i < nObjects; i++) shas.push(buf.subarray(shaBase + i * 20, shaBase + (i + 1) * 20).toString('hex'));
  const offBase = shaBase + nObjects * 20 + nObjects * 4;
  const map = new Map();
  for (let i = 0; i < nObjects; i++) {
    let off = buf.readUInt32BE(offBase + i * 4);
    if (off & 0x80000000) {
      const msdBase = offBase + nObjects * 4;
      off = Number(buf.readBigUInt64BE(msdBase + (off & 0x7fffffff) * 8));
    }
    map.set(shas[i], off);
  }
  return { map, buf: null };
}
const indexes = packFiles.map((p) => ({ packPath: p, parsed: parseIdx(p.replace(/\.pack$/, '.idx')) })).filter((x) => x.parsed);
function inflateAt(buf, start) {
  for (let end = start + 64; end <= buf.length; end = Math.min(end * 2, buf.length)) {
    try { return zlib.inflateSync(buf.subarray(start, end)); } catch (e) { if (end >= buf.length) throw e; }
  }
  throw new Error('inflate failed');
}
function applyDelta(base, delta) {
  let p = 0;
  const varint = () => { let r = 0, sh = 0, b; do { b = delta[p++]; r |= (b & 0x7f) << sh; sh += 7; } while (b & 0x80); return r; };
  varint(); varint();
  const out = [];
  while (p < delta.length) {
    const op = delta[p++];
    if (op & 0x80) {
      let off = 0, len = 0;
      if (op & 0x01) off = delta[p++];
      if (op & 0x02) off |= delta[p++] << 8;
      if (op & 0x04) off |= delta[p++] << 16;
      if (op & 0x08) off |= delta[p++] << 24;
      if (op & 0x10) len = delta[p++];
      if (op & 0x20) len |= delta[p++] << 8;
      if (op & 0x40) len |= delta[p++] << 16;
      out.push(base.subarray(off, off + len));
    } else { out.push(delta.subarray(p, p + op)); p += op; }
  }
  return Buffer.concat(out);
}
function readPackObject(packPath, packBuf, offset) {
  let p = offset;
  let byte = packBuf[p++];
  const type = (byte >> 4) & 7;
  let shift = 4;
  while (byte & 0x80) { byte = packBuf[p++]; shift += 4; }
  if (type >= 1 && type <= 4) return { type, data: inflateAt(packBuf, p) };
  if (type === 6) {
    let b = packBuf[p++]; let neg = b & 0x7f;
    while (b & 0x80) { b = packBuf[p++]; neg = ((neg + 1) << 7) | (b & 0x7f); }
    const base = readPackObject(packPath, packBuf, offset - neg);
    return { type: base.type, data: applyDelta(base.data, inflateAt(packBuf, p)) };
  }
  if (type === 7) {
    const baseSha = packBuf.subarray(p, p + 20).toString('hex'); p += 20;
    const base = readObjectBySha(baseSha);
    return { type: base.type, data: applyDelta(base.data, inflateAt(packBuf, p)) };
  }
  throw new Error('type ' + type);
}
function readObjectBySha(sha) {
  const loose = path.join(GIT, 'objects', sha.slice(0, 2), sha.slice(2));
  if (fs.existsSync(loose)) {
    const raw = zlib.inflateSync(fs.readFileSync(loose));
    const nul = raw.indexOf(0);
    return { type: raw.subarray(0, nul).toString().split(' ')[0], data: raw.subarray(nul + 1) };
  }
  for (const { packPath, parsed } of indexes) {
    const off = parsed.map.get(sha);
    if (off !== undefined) return readPackObject(packPath, fs.readFileSync(packPath), off);
  }
  return null;
}
function parseCommit(buf) {
  const s = buf.toString();
  return {
    tree: s.match(/^tree ([0-9a-f]{40})/m)?.[1],
    parents: [...s.matchAll(/^parent ([0-9a-f]{40})/gm)].map((m) => m[1]),
    time: (() => { const m = s.match(/^committer .* (\d{9,10}) /m); return m ? parseInt(m[1], 10) : 0; })(),
  };
}
function getTreeEntry(treeSha, name) {
  const obj = readObjectBySha(treeSha);
  if (!obj || obj.type !== 'tree') return null;
  let p = 0; const buf = obj.data;
  while (p < buf.length) {
    const sp = buf.indexOf(0x20, p);
    const nul = buf.indexOf(0, sp + 1);
    const entryName = buf.subarray(sp + 1, nul).toString();
    const sha = buf.subarray(nul + 1, nul + 21).toString('hex');
    p = nul + 21;
    if (entryName === name) return sha;
  }
  return null;
}

const backup = fs.readFileSync(BACKUP, 'utf8');
const backupLines = new Set(backup.split('\n').map((l) => l.trim()).filter((l) => l.length > 0));

// collect every historical snapshot of public/game2.html
const refs = new Set();
for (const r of ['HEAD', 'refs/heads/main', 'refs/heads/master']) { const s = readRefFile(r); if (s) refs.add(s); }
for (const sha of Object.values(packedRefs())) if (sha.length === 40) refs.add(sha);
const refsDir = path.join(GIT, 'refs');
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else { const s = fs.readFileSync(full, 'utf8').trim(); if (/^[0-9a-f]{40}$/.test(s)) refs.add(s); }
  }
})(refsDir);

const visited = new Set();
const snapshots = []; // { time, sha, lines: string[] }
function walkCommit(sha, depth) {
  if (!sha || visited.has(sha) || depth > 400) return;
  visited.add(sha);
  const obj = readObjectBySha(sha);
  if (!obj || obj.type !== 'commit') return;
  const c = parseCommit(obj.data);
  const publicTree = c.tree ? getTreeEntry(c.tree, 'public') : null;
  if (publicTree) {
    const htmlSha = getTreeEntry(publicTree, 'game2.html');
    if (htmlSha) {
      const blob = readObjectBySha(htmlSha);
      if (blob && blob.type === 'blob') {
        snapshots.push({ time: c.time, sha: htmlSha, lines: blob.data.toString('utf8').split('\n').map((l) => l.trim()).filter((l) => l.length > 0) });
      }
    }
  }
  for (const p of c.parents) walkCommit(p, depth + 1);
}
for (const sha of refs) walkCommit(sha, 0);
// current working tree file counts as a snapshot too
snapshots.push({ time: Infinity, sha: 'WORKING TREE', lines: fs.readFileSync(TARGET, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.length > 0) });

console.log('backup lines:', backupLines.size, '| snapshots found:', snapshots.length);

// For each snapshot: lines NOT in the backup and NOT in any other snapshot.
// (A line that exists in another snapshot is not lost by deleting the backup.)
const byLine = new Map(); // line -> Set(snapshot ids containing it)
for (const snap of snapshots) {
  for (const l of new Set(snap.lines)) {
    if (!byLine.has(l)) byLine.set(l, new Set());
    byLine.get(l).add(snap.sha);
  }
}
const problems = [];
for (const snap of snapshots) {
  if (snap.sha === 'WORKING TREE') continue;
  const unique = snap.lines.filter((l) => !backupLines.has(l) && byLine.get(l)?.size === 1);
  if (unique.length > 0) {
    problems.push({ sha: snap.sha, time: snap.time, count: unique.length, sample: unique.slice(0, 5) });
  }
}

if (problems.length === 0) {
  console.log('RESULT: SAFE — every historical game2.html line survives in the backup or another snapshot.');
} else {
  console.log('RESULT: REVIEW — snapshots with lines that exist ONLY there (still in git; deleting the BACKUP does not touch these):');
  for (const p of problems.sort((a, b) => b.count - a.count).slice(0, 8)) {
    console.log(`  ${p.sha} (${new Date(p.time * 1000).toISOString().slice(0, 10)}): ${p.count} unique lines, e.g.`, JSON.stringify(p.sample));
  }
}

// THE deletion-safety direction: backup lines that exist in NO git snapshot
// (and not in the current working tree) would be LOST if the backup is
// deleted, because isolate/ is gitignored — the backup is not in git either.
const allSnapshotLines = new Set();
for (const [, lines] of [...byLine.entries()]) { /* placeholder to keep shape */ }
for (const [line, ids] of byLine) allSnapshotLines.add(line);
// working-tree lines are already in byLine via the WORKING TREE snapshot
const onlyInBackup = [...backupLines].filter((l) => !allSnapshotLines.has(l));
console.log('---');
console.log('backup lines that exist in NO git snapshot / working tree:', onlyInBackup.length);
if (onlyInBackup.length > 0) {
  console.log('  sample:', JSON.stringify(onlyInBackup.slice(0, 10)));
  console.log('RESULT: KEEP (or archive outside the repo) — deleting would lose real content.');
} else {
  console.log('RESULT: SAFE TO DELETE — the backup is fully redundant with git history.');
}
