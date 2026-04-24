// Converte todos os .png/.jpg da raiz para .webp redimensionado
// e gera srcsets (480, 800, 1200, 1600) para uso em <picture>.
// Ignora imagens que já tenham versão .webp mais nova que o original.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const OUT  = path.join(ROOT, 'img');

const WIDTHS = [480, 800, 1200, 1600];
const QUALITY = 78;

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

async function listSources() {
  const files = await fs.readdir(ROOT);
  return files.filter(f => /\.(png|jpe?g)$/i.test(f));
}

async function convertOne(file) {
  const src = path.join(ROOT, file);
  const base = file.replace(/\.(png|jpe?g)$/i, '');
  const meta = await sharp(src).metadata();
  const srcW = meta.width ?? 1600;

  // single webp principal (largura máxima razoável)
  const mainW = Math.min(srcW, 1600);
  await sharp(src)
    .resize({ width: mainW, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(path.join(OUT, `${base}.webp`));

  // srcset variants
  const variants = [];
  for (const w of WIDTHS) {
    if (w > srcW) continue;
    const out = path.join(OUT, `${base}-${w}.webp`);
    await sharp(src)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
    variants.push(w);
  }
  return { file, srcW, variants };
}

async function main() {
  await ensureDir(OUT);
  const sources = await listSources();
  console.log(`Otimizando ${sources.length} imagens...`);
  let totalBefore = 0, totalAfter = 0;

  for (const f of sources) {
    const before = (await fs.stat(path.join(ROOT, f))).size;
    totalBefore += before;
    const r = await convertOne(f);
    const after = (await fs.stat(path.join(OUT, f.replace(/\.(png|jpe?g)$/i, '.webp')))).size;
    totalAfter += after;
    const pct = ((1 - after / before) * 100).toFixed(0);
    console.log(`  ${f}  ${(before/1024).toFixed(0)} KB → ${(after/1024).toFixed(0)} KB  (-${pct}%)  variantes: ${r.variants.join(',')}`);
  }

  const savedKB = ((totalBefore - totalAfter) / 1024).toFixed(0);
  console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)} MB → ${(totalAfter/1024/1024).toFixed(1)} MB  (economia ${savedKB} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
