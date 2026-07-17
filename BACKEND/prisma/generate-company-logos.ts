import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Los 11 logos "reales" del seed anterior (`update-company-logos.ts`) eran en
 * realidad la misma silueta abstracta reusada, repartida entre las 61 empresas
 * (5-6 empresas por archivo). Este script genera una marca única por empresa:
 * combina una de 22 siluetas simples con una de 22 paletas, sin repetir la
 * combinación (silueta, color) entre empresas, y con preferencia temática por
 * sector cuando aplica (agro → hoja, salud → pulso, finanzas → barras, etc.).
 */

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string });
const prisma = new PrismaClient({ adapter });

const COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777',
  '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#0f766e', '#b91c1c',
  '#15803d', '#a21caf', '#1d4ed8', '#c2410c', '#0369a1', '#6d28d9',
  '#be123c', '#166534', '#92400e', '#3730a3',
];

type MarkFn = () => string;

const MARKS: MarkFn[] = [
  // 0 leaf
  () => `<g transform="rotate(45 100 100)"><ellipse cx="100" cy="100" rx="55" ry="30" fill="#fff"/></g><line x1="55" y1="145" x2="145" y2="55" stroke-opacity="0.35" stroke="#000" stroke-width="4"/>`,
  // 1 sunburst
  () => {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x1 = 100 + 34 * Math.cos(a), y1 = 100 + 34 * Math.sin(a);
      const x2 = 100 + 68 * Math.cos(a), y2 = 100 + 68 * Math.sin(a);
      rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`;
    }
    return rays + `<circle cx="100" cy="100" r="26" fill="#fff"/>`;
  },
  // 2 circuit-nodes
  () => `<line x1="60" y1="130" x2="100" y2="70" stroke="#fff" stroke-width="6"/><line x1="100" y1="70" x2="145" y2="120" stroke="#fff" stroke-width="6"/><circle cx="60" cy="130" r="14" fill="#fff"/><circle cx="100" cy="70" r="14" fill="#fff"/><circle cx="145" cy="120" r="14" fill="#fff"/>`,
  // 3 cloud
  () => `<circle cx="75" cy="105" r="26" fill="#fff"/><circle cx="115" cy="95" r="32" fill="#fff"/><circle cx="145" cy="115" r="20" fill="#fff"/><rect x="55" y="105" width="110" height="35" rx="17" fill="#fff"/>`,
  // 4 growth arrow
  () => `<polyline points="50,145 85,110 110,130 150,60" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><polygon points="150,60 128,66 144,82" fill="#fff"/>`,
  // 5 bars ascending
  () => `<rect x="55" y="110" width="24" height="45" rx="4" fill="#fff"/><rect x="88" y="85" width="24" height="70" rx="4" fill="#fff"/><rect x="121" y="55" width="24" height="100" rx="4" fill="#fff"/>`,
  // 6 hexagon outline
  () => `<polygon points="100,45 148,72 148,128 100,155 52,128 52,72" fill="none" stroke="#fff" stroke-width="9"/>`,
  // 7 shield + check
  () => `<path d="M100 45 L150 65 V105 C150 135 128 152 100 160 C72 152 50 135 50 105 V65 Z" fill="#fff"/><polyline points="80,105 95,120 125,88" fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="mark-accent"/>`,
  // 8 pulse wave
  () => `<polyline points="45,105 80,105 92,70 108,140 120,105 155,105" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 9 molecule
  () => `<line x1="70" y1="130" x2="100" y2="70" stroke="#fff" stroke-width="5"/><line x1="100" y1="70" x2="135" y2="125" stroke="#fff" stroke-width="5"/><line x1="70" y1="130" x2="135" y2="125" stroke="#fff" stroke-width="5"/><circle cx="70" cy="130" r="12" fill="#fff"/><circle cx="100" cy="70" r="16" fill="#fff"/><circle cx="135" cy="125" r="12" fill="#fff"/>`,
  // 10 gear
  () => `<circle cx="100" cy="100" r="38" fill="none" stroke="#fff" stroke-width="14" stroke-dasharray="12 10"/><circle cx="100" cy="100" r="16" fill="#fff"/>`,
  // 11 bridge arch
  () => `<path d="M45 130 Q100 55 155 130" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><line x1="65" y1="130" x2="65" y2="105" stroke="#fff" stroke-width="8" stroke-linecap="round"/><line x1="135" y1="130" x2="135" y2="105" stroke="#fff" stroke-width="8" stroke-linecap="round"/><line x1="45" y1="140" x2="155" y2="140" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
  // 12 tower / building
  () => {
    let windows = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      windows += `<rect x="${75 + c * 30}" y="${65 + r * 28}" width="16" height="16" rx="2" fill="${'#00000022'}"/>`;
    }
    return `<rect x="65" y="55" width="70" height="100" rx="4" fill="#fff"/>${windows}`;
  },
  // 13 scale (legal)
  () => `<line x1="100" y1="50" x2="100" y2="150" stroke="#fff" stroke-width="7"/><line x1="60" y1="70" x2="140" y2="70" stroke="#fff" stroke-width="7"/><circle cx="60" cy="95" r="16" fill="none" stroke="#fff" stroke-width="6"/><circle cx="140" cy="95" r="16" fill="none" stroke="#fff" stroke-width="6"/><rect x="82" y="145" width="36" height="10" rx="3" fill="#fff"/>`,
  // 14 book
  () => `<path d="M100 65 C85 55 65 55 55 62 V140 C65 133 85 133 100 143 Z" fill="#fff"/><path d="M100 65 C115 55 135 55 145 62 V140 C135 133 115 133 100 143 Z" fill="#fff" opacity="0.75"/>`,
  // 15 megaphone
  () => `<polygon points="55,95 110,65 110,140 55,110" fill="#fff"/><rect x="45" y="93" width="12" height="22" rx="3" fill="#fff"/><path d="M120 80 Q140 100 120 122" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M132 70 Q158 100 132 132" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>`,
  // 16 route + pin
  () => `<path d="M50 145 Q90 145 95 110 Q100 75 145 65" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="3 12" stroke-linecap="round"/><circle cx="145" cy="60" r="14" fill="#fff"/>`,
  // 17 cart (comercio / e-commerce)
  () => `<polygon points="55,70 150,70 138,120 68,120" fill="#fff"/><line x1="40" y1="60" x2="55" y2="70" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="80" cy="140" r="10" fill="#fff"/><circle cx="125" cy="140" r="10" fill="#fff"/>`,
  // 18 grid (contabilidad / datos)
  () => {
    let cells = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      cells += `<rect x="${65 + c * 26}" y="${65 + r * 26}" width="18" height="18" rx="3" fill="#fff"/>`;
    }
    return cells;
  },
  // 19 compass / star (consultoría)
  () => `<polygon points="100,45 112,88 155,100 112,112 100,155 88,112 45,100 88,88" fill="#fff"/>`,
  // 20 orbit rings (analítica / cloud)
  () => `<ellipse cx="100" cy="100" rx="60" ry="24" fill="none" stroke="#fff" stroke-width="6" transform="rotate(20 100 100)"/><ellipse cx="100" cy="100" rx="60" ry="24" fill="none" stroke="#fff" stroke-width="6" transform="rotate(-20 100 100)"/><circle cx="100" cy="100" r="12" fill="#fff"/>`,
  // 21 infinity (agile / BPO continuo)
  () => `<path d="M70 100 C70 80 90 80 100 100 C110 120 130 120 130 100 C130 80 110 80 100 100 C90 120 70 120 70 100 Z" fill="none" stroke="#fff" stroke-width="10"/>`,
];

interface SectorRule { pattern: RegExp; marks: number[] }

const SECTOR_RULES: SectorRule[] = [
  { pattern: /salud|health/i, marks: [8, 0] },
  { pattern: /agro/i, marks: [0, 1] },
  { pattern: /energ/i, marks: [1, 4] },
  { pattern: /cloud|devops/i, marks: [3, 20] },
  { pattern: /tecnolog|software|innovaci[oó]n|it\b|analítica|datos|data/i, marks: [2, 20, 18] },
  { pattern: /finan|fintech/i, marks: [5, 4] },
  { pattern: /contab/i, marks: [18, 5] },
  { pattern: /construcci[oó]n/i, marks: [11, 12] },
  { pattern: /legal|jur[íi]dic/i, marks: [13] },
  { pattern: /marketing/i, marks: [15] },
  { pattern: /log[íi]stica/i, marks: [16] },
  { pattern: /educaci[oó]n/i, marks: [14] },
  { pattern: /recursos humanos|administraci[oó]n/i, marks: [9] },
  { pattern: /dise[ñn]o|ux|ui/i, marks: [19, 6] },
  { pattern: /telecomunicaciones/i, marks: [8] },
  { pattern: /bpo/i, marks: [21] },
  { pattern: /comercio|e-commerce/i, marks: [17] },
  { pattern: /consultor[íi]a/i, marks: [19] },
  { pattern: /ingenier[íi]a/i, marks: [10, 6] },
  { pattern: /seguridad/i, marks: [7] },
];

function markIndicesFor(sector: string | null): number[] {
  for (const rule of SECTOR_RULES) {
    if (sector && rule.pattern.test(sector)) return rule.marks;
  }
  return [];
}

function buildSvg(markIndex: number, color: string, circleBase: boolean): string {
  const inner = MARKS[markIndex]().replace(/class="mark-accent"/g, `stroke="${color}"`);
  const bg = circleBase
    ? `<circle cx="100" cy="100" r="100" fill="${color}"/>`
    : `<rect width="200" height="200" rx="34" fill="${color}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${bg}${inner}</svg>\n`;
}

async function main() {
  console.log('\n🎨 Generando logos únicos por empresa\n');

  const companies = await prisma.companyProfile.findMany({
    select: { id: true, companyName: true, sector: true },
    orderBy: { id: 'asc' },
  });

  const logosDir = path.join(process.cwd(), '..', 'FRONTEND', 'public', 'assets', 'company-logos');
  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  const usedPairs = new Set<string>();
  let updated = 0;

  for (const company of companies) {
    const preferred = markIndicesFor(company.sector);
    const order = preferred.length ? [...preferred, ...MARKS.map((_, i) => i)] : MARKS.map((_, i) => i);

    let markIdx = -1;
    let colorIdx = -1;
    outer: for (const mi of order) {
      for (let ci = 0; ci < COLORS.length; ci++) {
        const key = `${mi}-${ci}`;
        if (!usedPairs.has(key)) { markIdx = mi; colorIdx = ci; usedPairs.add(key); break outer; }
      }
    }
    if (markIdx === -1) throw new Error(`Sin combinaciones libres para empresa ${company.id} (${company.companyName})`);

    const color = COLORS[colorIdx];
    const circleBase = company.id % 2 === 0;
    const svg = buildSvg(markIdx, color, circleBase);
    const filename = `logo-${company.id}.svg`;
    fs.writeFileSync(path.join(logosDir, filename), svg);

    await prisma.companyProfile.update({
      where: { id: company.id },
      data: { logoUrl: `/assets/company-logos/${filename}` },
    });
    updated++;
  }

  console.log(`  ✓  ${updated} logos generados y asignados (${companies.length} empresas, ${usedPairs.size} combinaciones únicas usadas)`);

  // Limpiar los 11 archivos compartidos del set anterior — quedan huérfanos, ya no los referencia ninguna fila.
  const legacyNames = [
    'agrotech.svg', 'andina-software.svg', 'caribe-digital.svg', 'cloudnova.svg', 'databridge.svg',
    'finsoft.svg', 'innovahealth.svg', 'novatech.svg', 'pixelmind.svg', 'sistemas-sur.svg', 'talento-llanero.svg',
  ];
  let removed = 0;
  for (const name of legacyNames) {
    const p = path.join(logosDir, name);
    if (fs.existsSync(p)) { fs.unlinkSync(p); removed++; }
  }
  console.log(`  ✓  ${removed} logos compartidos del set anterior eliminados (ya no los usa ninguna empresa)`);

  console.log('\n✅ Listo!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
