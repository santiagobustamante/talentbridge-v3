import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

interface CompanyEntry {
  email: string;
  companyName: string;
  logoPath: string;
}

const logoMap: Record<string, string> = {
  'empresa001@demo.com': '/assets/company-logos/talento-llanero.svg',
  'empresa002@demo.com': '/assets/company-logos/andina-software.svg',
  'empresa003@demo.com': '/assets/company-logos/novatech.svg',
  'empresa004@demo.com': '/assets/company-logos/caribe-digital.svg',
  'empresa005@demo.com': '/assets/company-logos/databridge.svg',
  'empresa006@demo.com': '/assets/company-logos/cloudnova.svg',
  'empresa007@demo.com': '/assets/company-logos/sistemas-sur.svg',
  'empresa008@demo.com': '/assets/company-logos/pixelmind.svg',
  'empresa009@demo.com': '/assets/company-logos/innovahealth.svg',
  'empresa010@demo.com': '/assets/company-logos/finsoft.svg',
  'empresa011@demo.com': '/assets/company-logos/agrotech.svg',
};

const allLogos = Object.values(logoMap);

function getLogoForIndex(index: number): string {
  return allLogos[index % allLogos.length];
}

const companies: CompanyEntry[] = [
  { email: 'empresa001@demo.com', companyName: 'Talento Llanero S.A.S.', logoPath: logoMap['empresa001@demo.com'] },
  { email: 'empresa002@demo.com', companyName: 'Andina Software Group S.A.S.', logoPath: logoMap['empresa002@demo.com'] },
  { email: 'empresa003@demo.com', companyName: 'NovaTech Solutions Colombia', logoPath: logoMap['empresa003@demo.com'] },
  { email: 'empresa004@demo.com', companyName: 'Caribe Digital Labs S.A.S.', logoPath: logoMap['empresa004@demo.com'] },
  { email: 'empresa005@demo.com', companyName: 'DataBridge Analytics', logoPath: logoMap['empresa005@demo.com'] },
  { email: 'empresa006@demo.com', companyName: 'CloudNova Ingeniería', logoPath: logoMap['empresa006@demo.com'] },
  { email: 'empresa007@demo.com', companyName: 'Sistemas Integrales del Sur', logoPath: logoMap['empresa007@demo.com'] },
  { email: 'empresa008@demo.com', companyName: 'PixelMind Studio S.A.S.', logoPath: logoMap['empresa008@demo.com'] },
  { email: 'empresa009@demo.com', companyName: 'InnovaHealth Tech', logoPath: logoMap['empresa009@demo.com'] },
  { email: 'empresa010@demo.com', companyName: 'FinSoft Colombia', logoPath: logoMap['empresa010@demo.com'] },
  { email: 'empresa011@demo.com', companyName: 'AgroTech Llanos S.A.S.', logoPath: logoMap['empresa011@demo.com'] },

  // seed-jobs.ts companies - cycle through available logos
  { email: 'rh.llanero@demo.com', companyName: 'Talento Llanero S.A.S.', logoPath: getLogoForIndex(0) },
  { email: 'andina.tech@demo.com', companyName: 'Andina Tech Solutions', logoPath: getLogoForIndex(1) },
  { email: 'orinoquia.sw@demo.com', companyName: 'Orinoquia Software Lab', logoPath: getLogoForIndex(2) },
  { email: 'datanova@demo.com', companyName: 'DataNova Colombia', logoPath: getLogoForIndex(3) },
  { email: 'cafe.digital@demo.com', companyName: 'Café Digital S.A.S.', logoPath: getLogoForIndex(4) },
  { email: 'biosalud@demo.com', companyName: 'BioSalud Integral', logoPath: getLogoForIndex(5) },
  { email: 'agrosmart@demo.com', companyName: 'AgroSmart Colombia', logoPath: getLogoForIndex(6) },
  { email: 'horizonte.const@demo.com', companyName: 'Constructora Horizonte', logoPath: getLogoForIndex(7) },
  { email: 'finorte@demo.com', companyName: 'Financiera Norte', logoPath: getLogoForIndex(8) },
  { email: 'logistics.express@demo.com', companyName: 'Logística Express Colombia', logoPath: getLogoForIndex(9) },
  { email: 'mkt360@demo.com', companyName: 'Marketing 360 Group', logoPath: getLogoForIndex(10) },
  { email: 'sanrafael.clinica@demo.com', companyName: 'Clínica San Rafael', logoPath: getLogoForIndex(0) },
  { email: 'educatech@demo.com', companyName: 'EducaTech LATAM', logoPath: getLogoForIndex(1) },
  { email: 'cucuta.dh@demo.com', companyName: 'Cúcuta Digital Hub', logoPath: getLogoForIndex(2) },
  { email: 'villavo.apps@demo.com', companyName: 'Villavo Apps', logoPath: getLogoForIndex(3) },
  { email: 'bogota.cloud@demo.com', companyName: 'Bogotá Cloud Services', logoPath: getLogoForIndex(4) },
  { email: 'caribe.sw@demo.com', companyName: 'Caribe Software Factory', logoPath: getLogoForIndex(5) },
  { email: 'innova.contable@demo.com', companyName: 'Innova Contable', logoPath: getLogoForIndex(6) },
  { email: 'redcom@demo.com', companyName: 'RedCom Telecomunicaciones', logoPath: getLogoForIndex(7) },
  { email: 'soluciones.juridicas@demo.com', companyName: 'Soluciones Jurídicas Empresariales', logoPath: getLogoForIndex(8) },
  { email: 'grupo.adm.capital@demo.com', companyName: 'Grupo Administrativo Capital', logoPath: getLogoForIndex(9) },
  { email: 'ingenia.proyectos@demo.com', companyName: 'Ingenia Proyectos S.A.S.', logoPath: getLogoForIndex(10) },
  { email: 'llanos.data@demo.com', companyName: 'Llanos Data Center', logoPath: getLogoForIndex(0) },
  { email: 'global.support@demo.com', companyName: 'Global Support BPO', logoPath: getLogoForIndex(1) },
  { email: 'comercial.andina@demo.com', companyName: 'Comercializadora Andina', logoPath: getLogoForIndex(2) },
  { email: 'ecommerce.co@demo.com', companyName: 'E-commerce Colombia', logoPath: getLogoForIndex(3) },
  { email: 'diseno.vivo@demo.com', companyName: 'Diseño Vivo Studio', logoPath: getLogoForIndex(4) },
  { email: 'automatiza@demo.com', companyName: 'Automatiza Industrial', logoPath: getLogoForIndex(5) },
  { email: 'legaltech.co@demo.com', companyName: 'LegalTech Colombia', logoPath: getLogoForIndex(6) },
  { email: 'rrhh.plus@demo.com', companyName: 'Recursos Humanos Plus', logoPath: getLogoForIndex(7) },
  { email: 'seguridad.it@demo.com', companyName: 'Seguridad IT Colombia', logoPath: getLogoForIndex(8) },
  { email: 'salud.ocupacional@demo.com', companyName: 'Salud Ocupacional Integral', logoPath: getLogoForIndex(9) },
  { email: 'findata@demo.com', companyName: 'FinData Analytics', logoPath: getLogoForIndex(10) },
  { email: 'logistrans@demo.com', companyName: 'LogisTrans Nacional', logoPath: getLogoForIndex(0) },
  { email: 'tecnoredes@demo.com', companyName: 'TecnoRedes Colombia', logoPath: getLogoForIndex(1) },
  { email: 'bluepixel@demo.com', companyName: 'BluePixel Agency', logoPath: getLogoForIndex(2) },
  { email: 'campotech@demo.com', companyName: 'CampoTech Agro', logoPath: getLogoForIndex(3) },
  { email: 'urbania@demo.com', companyName: 'Urbania Construcciones', logoPath: getLogoForIndex(4) },
  { email: 'sw.oriente@demo.com', companyName: 'Software del Oriente', logoPath: getLogoForIndex(5) },
  { email: 'soluciones.247@demo.com', companyName: 'Soluciones Empresariales 24/7', logoPath: getLogoForIndex(6) },
  { email: 'ecopetrol.tech@demo.com', companyName: 'EcoPetrol Tech', logoPath: getLogoForIndex(7) },
  { email: 'manizales.dev@demo.com', companyName: 'Manizales Dev House', logoPath: getLogoForIndex(8) },
  { email: 'neiva.digital@demo.com', companyName: 'Neiva Digital', logoPath: getLogoForIndex(9) },
  { email: 'tunja.soft@demo.com', companyName: 'TunjaSoft', logoPath: getLogoForIndex(10) },
  { email: 'valledupar.tecnologia@demo.com', companyName: 'Valledupar Tecnología', logoPath: getLogoForIndex(0) },
  { email: 'constructora.litoral@demo.com', companyName: 'Constructora Litoral', logoPath: getLogoForIndex(1) },
  { email: 'agencia.pacifico@demo.com', companyName: 'Agencia Pacífico', logoPath: getLogoForIndex(2) },
  { email: 'servicios.salud.col@demo.com', companyName: 'Servicios Salud Colombia', logoPath: getLogoForIndex(3) },
  { email: 'data.driven@demo.com', companyName: 'Data Driven S.A.S.', logoPath: getLogoForIndex(4) },
  { email: 'log.yopal@demo.com', companyName: 'Logística Yopal', logoPath: getLogoForIndex(5) },
];

async function main() {
  console.log('\n🖼️  Actualizando logos de empresa (SVG)...\n');

  let updated = 0;
  let skipped = 0;

  for (const c of companies) {
    const user = await prisma.user.findUnique({
      where: { email: c.email },
      include: { companyProfile: true },
    });

    if (!user || !user.companyProfile) {
      console.log(`  ⚠️  No encontrada: ${c.email} (${c.companyName})`);
      skipped++;
      continue;
    }

    await prisma.companyProfile.update({
      where: { userId: user.id },
      data: { logoUrl: c.logoPath },
    });

    console.log(`  ✓  ${c.companyName} → ${c.logoPath}`);
    updated++;
  }

  console.log(`\n📊  Actualizadas: ${updated} | No encontradas: ${skipped}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
