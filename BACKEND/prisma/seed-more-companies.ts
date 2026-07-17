import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { UserRole } from '../libs/database/src/generated/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string });
const prisma = new PrismaClient({ adapter });

interface CompanySeed {
  email: string;
  companyName: string;
  nit: string;
  city: string;
  sector: string;
  phone: string;
  website: string;
  description: string;
  jobCount: number;
}

const companies: CompanySeed[] = [
  {
    email: 'empresa002@demo.com', companyName: 'Andina Software Group S.A.S.',
    nit: '901.002.001-2', city: 'Bogotá, Colombia', sector: 'Desarrollo de Software',
    phone: '+57 601 745 2300', website: 'https://andinasoftware.com.co',
    description: 'Andina Software Group es una empresa colombiana especializada en el desarrollo de software a la medida, aplicaciones empresariales, plataformas web y soluciones móviles. Trabajamos con tecnologías modernas y metodologías ágiles para entregar productos de alta calidad a nuestros clientes en Latinoamérica.',
    jobCount: 8,
  },
  {
    email: 'empresa003@demo.com', companyName: 'NovaTech Solutions Colombia',
    nit: '901.003.002-3', city: 'Medellín, Colombia', sector: 'Tecnología e Innovación',
    phone: '+57 604 389 1200', website: 'https://novatechsoluciones.co',
    description: 'NovaTech Solutions es una compañía de tecnología e innovación enfocada en la transformación digital de empresas medianas y grandes. Desarrollamos soluciones de software, automatización de procesos, inteligencia de negocios y consultoría tecnológica.',
    jobCount: 7,
  },
  {
    email: 'empresa004@demo.com', companyName: 'Caribe Digital Labs S.A.S.',
    nit: '901.004.003-4', city: 'Barranquilla, Colombia', sector: 'Transformación Digital',
    phone: '+57 605 322 8900', website: 'https://caribedigital.co',
    description: 'Caribe Digital Labs impulsa la transformación digital en la región Caribe mediante el desarrollo de software innovador, plataformas e-commerce, aplicaciones web progresivas y soluciones de datos para empresas.',
    jobCount: 5,
  },
  {
    email: 'empresa005@demo.com', companyName: 'DataBridge Analytics',
    nit: '901.005.004-5', city: 'Cali, Colombia', sector: 'Analítica de Datos',
    phone: '+57 602 556 3400', website: 'https://databridgeanalytics.com',
    description: 'DataBridge Analytics es una empresa especializada en inteligencia de negocios, analítica avanzada y ciencia de datos. Ayudamos a las organizaciones a tomar decisiones basadas en datos mediante dashboards, modelos predictivos y soluciones de big data.',
    jobCount: 6,
  },
  {
    email: 'empresa006@demo.com', companyName: 'CloudNova Ingeniería',
    nit: '901.006.005-6', city: 'Bucaramanga, Colombia', sector: 'Cloud Computing y DevOps',
    phone: '+57 607 691 4500', website: 'https://cloudnovaingenieria.com',
    description: 'CloudNova Ingeniería ofrece servicios de infraestructura cloud, migración a la nube, DevOps, automatización de despliegues y consultoría en arquitectura de sistemas para empresas en crecimiento.',
    jobCount: 6,
  },
  {
    email: 'empresa007@demo.com', companyName: 'Sistemas Integrales del Sur',
    nit: '901.007.006-7', city: 'Neiva, Colombia', sector: 'Soluciones Empresariales TI',
    phone: '+57 608 871 5500', website: 'https://sistemasintegralesdelsur.com',
    description: 'Sistemas Integrales del Sur desarrolla soluciones empresariales de tecnología, sistemas de gestión, facturación electrónica, puntos de venta y plataformas administrativas para pequeñas y medianas empresas.',
    jobCount: 4,
  },
  {
    email: 'empresa008@demo.com', companyName: 'PixelMind Studio S.A.S.',
    nit: '901.008.007-8', city: 'Pereira, Colombia', sector: 'Diseño UX/UI y Desarrollo Web',
    phone: '+57 606 341 6700', website: 'https://pixelmindstudio.co',
    description: 'PixelMind Studio combina diseño UX/UI con desarrollo web para crear experiencias digitales memorables. Diseñamos interfaces, prototipos, aplicaciones web y sitios corporativos con enfoque en usabilidad.',
    jobCount: 5,
  },
  {
    email: 'empresa009@demo.com', companyName: 'InnovaHealth Tech',
    nit: '901.009.008-9', city: 'Bogotá, Colombia', sector: 'HealthTech / Software en Salud',
    phone: '+57 601 912 3300', website: 'https://innovahealthtech.com.co',
    description: 'InnovaHealth Tech desarrolla software especializado para el sector salud: historias clínicas electrónicas, telemedicina, gestión hospitalaria y plataformas de bienestar para pacientes y profesionales.',
    jobCount: 7,
  },
  {
    email: 'empresa010@demo.com', companyName: 'FinSoft Colombia',
    nit: '901.010.009-0', city: 'Medellín, Colombia', sector: 'FinTech',
    phone: '+57 604 288 9900', website: 'https://finsoftcolombia.com',
    description: 'FinSoft Colombia crea soluciones fintech para el sector financiero: banca digital, pasarelas de pago, gestión de inversiones, cumplimiento normativo y plataformas de crédito con tecnología de punta.',
    jobCount: 10,
  },
  {
    email: 'empresa011@demo.com', companyName: 'AgroTech Llanos S.A.S.',
    nit: '901.011.010-1', city: 'Villavicencio, Colombia', sector: 'AgroTech / Tecnología para el campo',
    phone: '+57 608 681 2200', website: 'https://agrotechllanos.co',
    description: 'AgroTech Llanos desarrolla tecnología para el sector agropecuario: sensores IoT, plataformas de monitoreo de cultivos, trazabilidad, gestión de fincas y soluciones digitales para el campo colombiano.',
    jobCount: 4,
  },
];

const jobTemplates = [
  { title: 'Desarrollador Full Stack Junior', skills: 'Angular, TypeScript, NestJS, PostgreSQL, Git, APIs REST', salaryMin: 2500000, salaryMax: 3800000 },
  { title: 'Desarrollador Frontend Angular', skills: 'Angular, TypeScript, HTML, CSS, RxJS, APIs REST, Git', salaryMin: 2400000, salaryMax: 3600000 },
  { title: 'Desarrollador Backend NestJS', skills: 'NestJS, Node.js, PostgreSQL, Prisma, JWT, Docker, TypeScript', salaryMin: 2800000, salaryMax: 4200000 },
  { title: 'Ingeniero de Software Junior', skills: 'Ingeniería de software, Arquitectura, Bases de datos, Git, Metodologías ágiles', salaryMin: 3000000, salaryMax: 4500000 },
  { title: 'Analista QA Junior', skills: 'Pruebas funcionales, Selenium, Postman, Jira, Casos de prueba, Reporte de bugs', salaryMin: 2200000, salaryMax: 3200000 },
  { title: 'Analista de Datos Junior', skills: 'SQL, Python, Power BI, Excel, ETL, Estadística, Visualización', salaryMin: 2400000, salaryMax: 3500000 },
  { title: 'Desarrollador Python Junior', skills: 'Python, Django, Flask, PostgreSQL, APIs REST, Git, Docker', salaryMin: 2600000, salaryMax: 3800000 },
  { title: 'Soporte Técnico TI', skills: 'Soporte, Windows, Linux, Redes, Help Desk, Documentación, Active Directory', salaryMin: 1800000, salaryMax: 2500000 },
  { title: 'Practicante de Ingeniería de Sistemas', skills: 'Programación, HTML, CSS, JavaScript, Bases de datos, Trabajo en equipo', salaryMin: 1160000, salaryMax: 1500000 },
  { title: 'DevOps Junior', skills: 'Docker, Kubernetes, CI/CD, AWS, Linux, Git, Terraform, Jenkins', salaryMin: 3000000, salaryMax: 4500000 },
  { title: 'Diseñador UX/UI Junior', skills: 'Figma, Adobe XD, Diseño de interfaces, Prototipado, HTML, CSS, UX Research', salaryMin: 2200000, salaryMax: 3200000 },
  { title: 'Desarrollador Mobile Junior', skills: 'React Native, Flutter, Android, iOS, APIs REST, Git, Firebase', salaryMin: 2600000, salaryMax: 3800000 },
  { title: 'Técnico de Soporte de Aplicaciones', skills: 'Soporte TI, Bases de datos, SQL básico, Documentación, Atención al usuario', salaryMin: 1600000, salaryMax: 2200000 },
  { title: 'Analista de Ciberseguridad Junior', skills: 'Seguridad informática, Firewalls, SIEM, Ethical Hacking, Redes, ISO 27001', salaryMin: 2800000, salaryMax: 4000000 },
  { title: 'Administrador de Bases de Datos Junior', skills: 'PostgreSQL, MySQL, SQL Server, Backups, Performance, Tuning, Linux', salaryMin: 2500000, salaryMax: 3800000 },
];

const cities = ['Bogotá, Colombia', 'Medellín, Colombia', 'Cali, Colombia', 'Barranquilla, Colombia', 'Bucaramanga, Colombia', 'Neiva, Colombia', 'Pereira, Colombia', 'Villavicencio, Colombia', 'Remoto, Colombia'];
const modalities = ['Remoto', 'Híbrido', 'Presencial'];
const contractTypes = ['Término indefinido', 'Término fijo', 'Obra o labor', 'Aprendizaje', 'Prestación de servicios', 'Temporal / ocasional / accidental', 'Prácticas'];
const workloads = ['Tiempo completo', 'Medio tiempo', 'Por horas', 'Flexible'];

async function main() {
  console.log('\n🏢 Creando 10 empresas demo...\n');
  const passwordHash = await bcrypt.hash('Empresa.123', 10);

  let totalJobs = 0;

  for (const c of companies) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { passwordHash, role: UserRole.COMPANY },
      create: { email: c.email, passwordHash, role: UserRole.COMPANY },
    });

    await prisma.companyProfile.upsert({
      where: { userId: user.id },
      update: {
        companyName: c.companyName, nit: c.nit, sector: c.sector, city: c.city,
        phone: c.phone, websiteUrl: c.website, description: c.description,
        logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.companyName.substring(0,20))}&size=256&background=2563eb&color=fff`,
      },
      create: {
        userId: user.id, companyName: c.companyName, nit: c.nit, sector: c.sector, city: c.city,
        phone: c.phone, websiteUrl: c.website, description: c.description,
        logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.companyName.substring(0,20))}&size=256&background=2563eb&color=fff`,
      },
    });

    // Delete old demo jobs and recreate
    await prisma.jobOffer.deleteMany({ where: { companyId: user.id } });

    for (let i = 0; i < c.jobCount; i++) {
      const tpl = jobTemplates[i % jobTemplates.length];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const mod = modalities[Math.floor(Math.random() * modalities.length)];
      const ct = contractTypes[Math.floor(Math.random() * contractTypes.length)];
      const wl = workloads[Math.floor(Math.random() * workloads.length)];

      await prisma.jobOffer.create({
        data: {
          companyId: user.id,
          title: tpl.title,
          description: `Buscamos ${tpl.title.toLowerCase()} para unirse a nuestro equipo de tecnología. Trabajarás en proyectos innovadores con tecnologías modernas.`,
          requirements: `Experiencia con ${tpl.skills}.\nCapacidad de trabajo en equipo.\nBuena comunicación.\nDeseo de aprender y crecer profesionalmente.`,
          responsibilities: `Desarrollar y mantener funcionalidades.\nParticipar en revisiones de código.\nColaborar con el equipo.\nDocumentar soluciones.\nApoyar pruebas y despliegues.`,
          city, modality: mod, contractType: ct, workload: wl,
          salaryMin: tpl.salaryMin, salaryMax: tpl.salaryMax,
          currency: 'COP',
          skillsRequired: tpl.skills,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    }

    console.log(`  ✓  ${c.companyName} - ${c.jobCount} vacantes`);
    totalJobs += c.jobCount;
  }

  // Optional: applications from Santiago
  const santiago = await prisma.user.findUnique({ where: { email: 'bustamantemolinasantiago@gmail.com' } });
  if (santiago) {
    const newJobs = await prisma.jobOffer.findMany({
      where: { companyId: { not: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    let appCount = 0;
    for (const job of newJobs) {
      const exists = await prisma.jobApplication.findUnique({
        where: { jobOfferId_candidateId: { jobOfferId: job.id, candidateId: santiago.id } },
      });
      if (!exists) {
        const statuses = ['PENDING', 'REVIEWED', 'REJECTED'];
        await prisma.jobApplication.create({
          data: {
            jobOfferId: job.id, candidateId: santiago.id,
            coverMessage: 'Adjunto mi perfil. Tengo interés en esta vacante y experiencia con tecnologías afines.',
            status: (statuses[appCount % statuses.length]) as any,
          },
        });
        appCount++;
      }
    }
    console.log(`\n  ✓  ${appCount} postulaciones demo de Santiago`);
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`  Empresas:   ${companies.length}`);
  console.log(`  Vacantes:   ${totalJobs}`);
  console.log('\n✅ Seed completado!\n');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
