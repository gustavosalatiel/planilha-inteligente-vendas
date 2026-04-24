import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');

const pairs = [
  ['f70cb841-0f64-40b3-91cc-c0418415db03.png',   'f70cb841-0f64-40b3-91cc-c0418415db03'],
  ['2b72d55f-6d8f-410e-b9c7-5f69c261c4aa.png',   '2b72d55f-6d8f-410e-b9c7-5f69c261c4aa'],
  ['a47981e7-3275-44de-8acc-03e04d4e83b5.png',   'a47981e7-3275-44de-8acc-03e04d4e83b5'],
  ['ddf7f1bc-ad83-4569-a25c-0648b2b0fce9.png',   'ddf7f1bc-ad83-4569-a25c-0648b2b0fce9'],
  ['da444664-8d6e-4c2d-8198-4f3b315ff292.png',   'da444664-8d6e-4c2d-8198-4f3b315ff292'],
  ['f9af2857-0fab-49f0-bf3e-5dd7735dd3c6.png',   'f9af2857-0fab-49f0-bf3e-5dd7735dd3c6'],
  ['dafd3ff1-98fa-4caa-bd77-0538b371b8af.png',   'dafd3ff1-98fa-4caa-bd77-0538b371b8af'],
  ['a73a45f7-1e33-48f0-876b-21d414f6f22a.png',   'a73a45f7-1e33-48f0-876b-21d414f6f22a'],
  ['5f90412b-d3cc-4ae7-9ae8-fa35bbf51c43.png',   '5f90412b-d3cc-4ae7-9ae8-fa35bbf51c43'],
  ['2efef129-c44a-46a7-b45f-8193b02895ef.png',   '2efef129-c44a-46a7-b45f-8193b02895ef'],
  ['893d137c-4202-47f3-bdd7-4eff8cf4e86c.png',   '893d137c-4202-47f3-bdd7-4eff8cf4e86c'],
  ['roudakova.anna_669755033_18577090384058295_4019744744811644976_n.jpg', 'roudakova.anna_669755033_18577090384058295_4019744744811644976_n'],
  ['download%20%282%29.jpg',   'download (2)'],
  ['download%20%2826%29.jpg',  'download (26)'],
  ['Comente%20CASAL%20para%20receber%20os%20Prompts%20%F0%9F%8E%81.jpg', 'Comente CASAL para receber os Prompts \u{1F381}'],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let total = 0;

for (const [orig, base] of pairs) {
  const webpUrl = './img/' + encodeURI(base) + '.webp';
  const re = new RegExp(esc(orig), 'g');
  const before = html;
  html = html.replace(re, webpUrl);
  const count = (before.match(re) || []).length;
  if (count) {
    console.log(`  ${orig}  →  ${webpUrl}  (${count}x)`);
    total += count;
  }
}

fs.writeFileSync('index.html', html);
console.log(`\nTotal: ${total} substituições.`);
