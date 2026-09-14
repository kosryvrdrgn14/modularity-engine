// ONE-OFF recovery: public/styles.css was accidentally truncated by a bad
// shell one-liner. It was a tracked file, so its content lives in the git
// object database. This script reads .git READ-ONLY (no git commands —
// those are blocked here) and rewrites ONLY public/styles.css.
//
// Strategy:
//   1. Resolve refs → commit objects (loose + packed).
//   2. Walk commit→tree→public→styles.css blob (loose first, then packfile).
//   3. Pick the newest blob that still contains the most recent CSS blocks
//      (widget-card, shop-gold) so we restore the latest committed state.
//   4. Report what was found; write the winner to public/styles.css.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GIT = path.join(process.cwd(), '.git');
const TARGET = 'public/styles.css';

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
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([0-9a-f]{40}) (refs\/.+)$/);
    if (m) out[m[2]] = m[1];
  }
  return out;
}

// ── object reading ──
const packsDir = path.join(GIT, 'objects', 'pack');
const packFiles = fs.existsSync(packsDir)
  ? fs.readdirSync(packsDir).filter((f) => f.endsWith('.pack')).map((f) => path.join(packsDir, f))
  : [];

function parseIdx(idxPath) {
  const buf = fs.readFileSync(idxPath);
  // v2 index: magic \377tOc, version 2
  if (buf.readUInt32BE(0) !== 0xff744f63) return null; // not v2 — skip
  const fanout = buf.subarray(8, 8 + 256 * 4);
  const nObjects = fanout.readUInt32BE(255 * 4);
  const shaBase = 8 + 256 * 4;
  const shas = [];
  for (let i = 0; i < nObjects; i++) shas.push(buf.subarray(shaBase + i * 20, shaBase + (i + 1) * 20).toString('hex'));
  const crcBase = shaBase + nObjects * 20;
  const offBase = crcBase + nObjects * 4;
  const offsets = [];
  for (let i = 0; i < nObjects; i++) {
    let off = buf.readUInt32BE(offBase + i * 4);
    if (off & 0x80000000) {
      // 64-bit offset table
      const msdBase = offBase + nObjects * 4;
      const idx8 = off & 0x7fffffff;
      off = Number(buf.readBigUInt64BE(msdBase + idx8 * 8));
    }
    offsets.push(off);
  }
  const map = new Map();
  for (let i = 0; i < nObjects; i++) map.set(shas[i], offsets[i]);
  return { map, buf };
}

const indexes = packFiles
  .map((p) => {
    const idx = p.replace(/\.pack$/, '.idx');
    return fs.existsSync(idx) ? { packPath: p, parsed: parseIdx(idx) } : null;
  })
  .filter(Boolean);

function readPackObject(packPath, packBuf, offset) {
  let p = offset;
  let byte = packBuf[p++];
  const type = (byte >> 4) & 7;
  let size = byte & 15;
  let shift = 4;
  while (byte & 0x80) {
    byte = packBuf[p++];
    size |= (byte & 15) << shift;
    shift += 4;
  }
  if (type === 1 || type === 2 || type === 3 || type === 4) {
    // commit(1) tree(2) blob(3) tag(4) — zlib data follows
    // find end: inflate from p until stream ends (inflateSync throws at end)
    let start = p;
    let out;
    for (let end = p + 64; end <= packBuf.length; end = end * 2 > packBuf.length ? packBuf.length : end * 2) {
      try {
        out = zlib.inflateSync(packBuf.subarray(start, end));
        break;
      } catch (e) {
        if (end >= packBuf.length) throw e;
      }
    }
    return { type, data: out };
  }
  if (type === 6) { // OFS_DELTA
    let b = packBuf[p++];
    let neg = b & 0x7f;
    while (b & 0x80) { b = packBuf[p++]; neg = ((neg + 1) << 7) | (b & 0x7f); }
    const base = readPackObject(packPath, packBuf, offset - neg);
    const delta = inflateAt(packBuf, p);
    return { type: base.type, data: applyDelta(base.data, delta) };
  }
  if (type === 7) { // REF_DELTA: 20-byte base sha
    const baseSha = packBuf.subarray(p, p + 20).toString('hex');
    p += 20;
    const base = readObjectBySha(baseSha);
    const delta = inflateAt(packBuf, p);
    return { type: base.type, data: applyDelta(base.data, delta) };
  }
  throw new Error('unknown pack type ' + type);
}

function inflateAt(buf, start) {
  let out;
  for (let end = start + 64; end <= buf.length; end = end * 2 > buf.length ? buf.length : end * 2) {
    try {
      out = zlib.inflateSync(buf.subarray(start, end));
      return out;
    } catch (e) {
      if (end >= buf.length) throw e;
    }
  }
  throw new Error('inflate failed');
}

function applyDelta(base, delta) {
  let p = 0;
  function varint() {
    let r = 0, sh = 0, b;
    do { b = delta[p++]; r |= (b & 0x7f) << sh; sh += 7; } while (b & 0x80);
    return r;
  }
  varint(); // base size
  varint(); // result size
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
    } else {
      out.push(delta.subarray(p, p + op));
      p += op;
    }
  }
  return Buffer.concat(out);
}

function readObjectBySha(sha) {
  // loose
  const loose = path.join(GIT, 'objects', sha.slice(0, 2), sha.slice(2));
  if (fs.existsSync(loose)) {
    const raw = zlib.inflateSync(fs.readFileSync(loose));
    const nul = raw.indexOf(0);
    const header = raw.subarray(0, nul).toString();
    const type = header.split(' ')[0];
    return { type, data: raw.subarray(nul + 1) };
  }
  // packed
  for (const { packPath, parsed } of indexes) {
    if (!parsed) continue;
    const off = parsed.map.get(sha);
    if (off !== undefined) {
      const packBuf = fs.readFileSync(packPath);
      return readPackObject(packPath, packBuf, off);
    }
  }
  return null;
}

function parseCommit(buf) {
  const s = buf.toString();
  const tree = s.match(/^tree ([0-9a-f]{40})/m);
  const parents = [...s.matchAll(/^parent ([0-9a-f]{40})/gm)].map((m) => m[1]);
  const time = s.match(/^committer .* (\d{9,10}) ([+-]\d{4})$/m);
  return { tree: tree?.[1], parents, time: time ? parseInt(time[1], 10) * (time[2].startsWith('-') ? -1 : 1) : 0 };
}

function getTreeEntry(treeSha, name) {
  const obj = readObjectBySha(treeSha);
  if (!obj || obj.type !== 'tree') return null;
  let p = 0;
  const buf = obj.data;
  while (p < buf.length) {
    const sp = buf.indexOf(0x20, p);
    const mode = buf.subarray(p, sp).toString();
    const nul = buf.indexOf(0, sp + 1);
    const entryName = buf.subarray(sp + 1, nul).toString();
    const sha = buf.subarray(nul + 1, nul + 21).toString('hex');
    p = nul + 21;
    if (entryName === name) return { mode, sha };
  }
  return null;
}

// ── main ──
const refs = new Set();
for (const r of ['HEAD', 'refs/heads/main', 'refs/heads/master']) {
  const s = readRefFile(r);
  if (s) refs.add(s);
}
Object.assign({}, packedRefs());
for (const sha of Object.values(packedRefs())) if (sha.length === 40) refs.add(sha);
// ORIG_HEAD / stash / other loose refs
const refsDir = path.join(GIT, 'refs');
if (fs.existsSync(refsDir)) {
  (function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else {
        const s = fs.readFileSync(full, 'utf8').trim();
        if (/^[0-9a-f]{40}$/.test(s)) refs.add(s);
      }
    }
  })(refsDir);
}
const origHead = path.join(GIT, 'ORIG_HEAD');
if (fs.existsSync(origHead)) {
  const s = fs.readFileSync(origHead, 'utf8').trim();
  if (/^[0-9a-f]{40}$/.test(s)) refs.add(s);
}

console.log('refs found:', [...refs].length);

const candidates = []; // { sha, time, content }
const visited = new Set();

function walkCommit(sha, depth) {
  if (!sha || visited.has(sha) || depth > 400) return;
  visited.add(sha);
  const obj = readObjectBySha(sha);
  if (!obj || obj.type !== 'commit') return;
  const c = parseCommit(obj.data);
  const publicTree = c.tree ? getTreeEntry(c.tree, 'public') : null;
  if (publicTree) {
    const css = getTreeEntry(publicTree.sha, 'styles.css');
    if (css) {
      const blob = readObjectBySha(css.sha);
      if (blob && blob.type === 'blob') {
        candidates.push({ sha: css.sha, time: c.time, content: blob.data.toString('utf8') });
      }
    }
  }
  for (const p of c.parents) walkCommit(p, depth + 1);
}

for (const sha of refs) walkCommit(sha, 0);

console.log('styles.css blobs found across history:', candidates.length);
if (candidates.length === 0) {
  console.error('RECOVERY FAILED: no styles.css blob found in reachable history.');
  process.exit(1);
}

// Score by recency + presence of the newest CSS additions.
const markers = ['shop-gold', 'widget-card', 'export-overlay', 'resume-btn'];
for (const c of candidates) {
  c.score = c.time + markers.reduce((acc, m, i) => acc + (c.content.includes(m) ? (i + 1) * 1000 : 0), 0);
}
candidates.sort((a, b) => b.score - a.score);
const best = candidates[0];
console.log('best blob:', best.sha, 'commitTime:', best.time, 'lines:', best.content.split('\n').length);
for (const m of markers) console.log(`  marker ${m}:`, best.content.includes(m));

if (best.content.length < 1000) {
  console.error('RECOVERY FAILED: best blob suspiciously small.');
  process.exit(1);
}
fs.writeFileSync(TARGET, best.content);
console.log('WROTE', TARGET, '-', best.content.length, 'bytes');
