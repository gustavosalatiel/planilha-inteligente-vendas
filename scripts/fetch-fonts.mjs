// Baixa fontes do Google Fonts e gera src/fonts.css com @font-face locais.
// Filtra apenas subsets latin e latin-ext (suficiente para pt/es).
import fs from 'node:fs/promises';
import path from 'node:path';

const GOOGLE_CSS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Geist:wght@400;600;700;800;900' +
  '&family=Fraunces:ital,opsz,wght@1,14..144,500' +
  '&display=swap';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  await fs.mkdir('fonts', { recursive: true });

  const css = await fetch(GOOGLE_CSS_URL, { headers: { 'User-Agent': UA } }).then(r => r.text());

  // parse todos @font-face blocks
  const blocks = css.match(/\/\*[^*]+\*\/\s*@font-face\s*{[^}]+}/g) || [];
  console.log(`Blocos encontrados: ${blocks.length}`);

  const kept = [];
  let idx = 0;

  for (const raw of blocks) {
    const subsetMatch = raw.match(/\/\*\s*([^*]+?)\s*\*\//);
    const subset = subsetMatch ? subsetMatch[1].trim() : '';
    // só queremos latin e latin-ext
    if (subset !== 'latin' && subset !== 'latin-ext') continue;

    const urlMatch = raw.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    const famMatch = raw.match(/font-family:\s*'([^']+)'/);
    const wMatch   = raw.match(/font-weight:\s*(\d+)/);
    const sMatch   = raw.match(/font-style:\s*(\w+)/);
    const urMatch  = raw.match(/unicode-range:\s*([^;]+)/);

    if (!urlMatch || !famMatch) continue;

    const family  = famMatch[1];
    const weight  = wMatch ? wMatch[1] : '400';
    const style   = sMatch ? sMatch[1] : 'normal';
    const unicode = urMatch ? urMatch[1] : '';

    const safeName = `${family.toLowerCase()}-${weight}-${style}-${subset}.woff2`;
    const outPath  = path.join('fonts', safeName);

    const buf = Buffer.from(await fetch(urlMatch[1]).then(r => r.arrayBuffer()));
    await fs.writeFile(outPath, buf);
    kept.push({ family, weight, style, unicode, file: safeName, size: buf.length, subset });
    idx++;
  }

  // escrever CSS local
  const lines = kept.map(f =>
`@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url('/fonts/${f.file}') format('woff2');
  unicode-range: ${f.unicode};
}`);

  await fs.writeFile('src/fonts.css', lines.join('\n\n') + '\n');

  console.log(`\nBaixadas ${kept.length} fontes (latin + latin-ext).`);
  const total = kept.reduce((s, f) => s + f.size, 0);
  console.log(`Tamanho total: ${(total / 1024).toFixed(0)} KB`);
  console.log('Arquivo CSS: src/fonts.css');
}

main().catch(e => { console.error(e); process.exit(1); });
