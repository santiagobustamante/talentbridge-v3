import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { UserRole } from '../libs/database/src/generated/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n🏢 Seed de Empresa Demo - Talento Llanero S.A.S.\n');

  const email = 'empresa001@demo.com';
  const password = 'Empresa.123';
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: UserRole.COMPANY },
    create: { email, passwordHash, role: UserRole.COMPANY },
  });
  console.log(`  ✓  Usuario: ${user.email} (id: ${user.id}, role: ${user.role})`);

  // 2. Upsert Company Profile
  const profile = await prisma.companyProfile.upsert({
    where: { userId: user.id },
    update: {
      companyName: 'Talento Llanero S.A.S.',
      nit: '901456789-3',
      sector: 'Tecnología / Desarrollo de Software',
      city: 'Villavicencio, Meta, Colombia',
      phone: '+57 608 672 4589',
      websiteUrl: 'https://talentollanero.com',
      description: 'Talento Llanero S.A.S. es una empresa colombiana dedicada al desarrollo de soluciones tecnológicas, plataformas web, automatización de procesos y transformación digital para organizaciones públicas y privadas. Nuestro equipo trabaja con metodologías ágiles, arquitectura moderna y tecnologías Full Stack para crear productos digitales escalables, seguros y orientados a resultados.',
      logoUrl: 'https://ui-avatars.com/api/?name=Talento+Llanero&size=256&background=7c3aed&color=fff',
    },
    create: {
      userId: user.id,
      companyName: 'Talento Llanero S.A.S.',
      nit: '901456789-3',
      sector: 'Tecnología / Desarrollo de Software',
      city: 'Villavicencio, Meta, Colombia',
      phone: '+57 608 672 4589',
      websiteUrl: 'https://talentollanero.com',
      description: 'Talento Llanero S.A.S. es una empresa colombiana dedicada al desarrollo de soluciones tecnológicas, plataformas web, automatización de procesos y transformación digital para organizaciones públicas y privadas. Nuestro equipo trabaja con metodologías ágiles, arquitectura moderna y tecnologías Full Stack para crear productos digitales escalables, seguros y orientados a resultados.',
      logoUrl: 'https://ui-avatars.com/api/?name=Talento+Llanero&size=256&background=7c3aed&color=fff',
    },
  });
  console.log(`  ✓  Perfil: ${profile.companyName} (NIT: ${profile.nit})`);

  // 3. Delete old demo jobs for this company and recreate
  await prisma.jobApplication.deleteMany({ where: { jobOffer: { companyId: user.id } } });
  await prisma.jobOffer.deleteMany({ where: { companyId: user.id } });
  console.log('  ✓  Vacantes antiguas limpiadas');

  const jobs = [
    {
      title: 'Desarrollador Full Stack Junior',
      description: 'Buscamos desarrollador Full Stack Junior para apoyar la construcción de aplicaciones web empresariales usando Angular, NestJS y PostgreSQL.',
      requirements: 'Conocimientos en Angular y TypeScript.\nConocimientos básicos/intermedios en NestJS.\nManejo de APIs REST.\nConocimientos en PostgreSQL.\nUso básico de Git y GitHub.\nBuena actitud para aprender.',
      responsibilities: 'Desarrollar componentes frontend.\nIntegrar servicios backend.\nApoyar la creación de endpoints.\nParticipar en pruebas funcionales.\nDocumentar funcionalidades.',
      city: 'Villavicencio, Meta, Colombia',
      modality: 'Híbrido',
      contractType: 'Término indefinido',
      salaryMin: 2500000,
      salaryMax: 3500000,
      currency: 'COP',
      skillsRequired: 'Angular, TypeScript, NestJS, PostgreSQL, Git, APIs REST',
      status: 'PUBLISHED',
    },
    {
      title: 'Practicante de Ingeniería de Sistemas',
      description: 'Buscamos estudiante de Ingeniería de Sistemas para práctica profesional en desarrollo web, soporte técnico y documentación de proyectos.',
      requirements: 'Estudiante de últimos semestres.\nConocimientos básicos en programación.\nManejo de HTML, CSS y JavaScript.\nInterés en desarrollo web.\nBuena comunicación y disposición para aprender.',
      responsibilities: 'Apoyar tareas de desarrollo.\nRealizar pruebas funcionales.\nDocumentar módulos.\nApoyar reuniones técnicas.\nOrganizar información de proyectos.',
      city: 'Villavicencio, Meta, Colombia',
      modality: 'Presencial',
      contractType: 'Prácticas',
      salaryMin: 1160000,
      salaryMax: 1300000,
      currency: 'COP',
      skillsRequired: 'HTML, CSS, JavaScript, Git, Documentación técnica, Trabajo en equipo',
      status: 'PUBLISHED',
    },
    {
      title: 'Desarrollador Backend Junior NestJS',
      description: 'Buscamos desarrollador backend junior con conocimientos en NestJS, Prisma y PostgreSQL para construir APIs REST seguras y escalables.',
      requirements: 'Conocimiento en Node.js.\nConocimiento en NestJS.\nManejo de PostgreSQL.\nConocimiento de autenticación JWT.\nConocimiento básico de Docker.\nBuenas prácticas de código.',
      responsibilities: 'Crear endpoints REST.\nModelar base de datos con Prisma.\nImplementar validaciones.\nCorregir bugs.\nDocumentar endpoints en Swagger.',
      city: 'Remoto, Colombia',
      modality: 'Remoto',
      contractType: 'Prestación de servicios',
      salaryMin: 3000000,
      salaryMax: 4000000,
      currency: 'COP',
      skillsRequired: 'NestJS, Node.js, Prisma, PostgreSQL, JWT, Docker, Swagger',
      status: 'PUBLISHED',
    },
    {
      title: 'Desarrollador Frontend Angular Junior',
      description: 'Buscamos desarrollador frontend junior para crear interfaces modernas, responsivas y conectadas con servicios backend.',
      requirements: 'Conocimiento en Angular.\nManejo de TypeScript.\nConocimientos en HTML y CSS.\nConsumo de APIs REST.\nManejo de formularios reactivos.\nAtención al detalle visual.',
      responsibilities: 'Crear vistas y componentes.\nConsumir servicios HTTP.\nValidar formularios.\nMejorar experiencia de usuario.\nCorregir errores visuales.',
      city: 'Bogotá, Colombia',
      modality: 'Remoto',
      contractType: 'Término fijo',
      salaryMin: 2500000,
      salaryMax: 3200000,
      currency: 'COP',
      skillsRequired: 'Angular, TypeScript, HTML, CSS, APIs REST, Diseño responsive',
      status: 'PUBLISHED',
    },
    {
      title: 'Analista Junior de Sistemas',
      description: 'Buscamos analista junior de sistemas para apoyar levantamiento de requerimientos, documentación, pruebas y seguimiento de proyectos tecnológicos.',
      requirements: 'Formación en Ingeniería de Sistemas o afines.\nCapacidad de análisis.\nConocimientos básicos de bases de datos.\nManejo de documentación técnica.\nComunicación efectiva.\nOrganización.',
      responsibilities: 'Levantar requerimientos.\nDocumentar historias de usuario.\nApoyar pruebas funcionales.\nHacer seguimiento a incidencias.\nApoyar al equipo de desarrollo.',
      city: 'Villavicencio, Meta, Colombia',
      modality: 'Híbrido',
      contractType: 'Término indefinido',
      salaryMin: 2200000,
      salaryMax: 3000000,
      currency: 'COP',
      skillsRequired: 'Análisis de requerimientos, SQL, Documentación, Pruebas funcionales, Comunicación, Trabajo en equipo',
      status: 'PUBLISHED',
    },
    {
      title: 'Ingeniero de Software Junior',
      description: 'Buscamos Ingeniero de Software Junior para participar en el diseño, desarrollo y mantenimiento de aplicaciones empresariales Full Stack.',
      requirements: 'Conocimiento en arquitectura de software.\nManejo de frontend y backend.\nConocimiento de bases de datos relacionales.\nUso de Git.\nInterés en buenas prácticas y patrones de diseño.\nCapacidad para resolver problemas.',
      responsibilities: 'Participar en diseño técnico.\nDesarrollar funcionalidades full stack.\nRevisar código.\nDocumentar soluciones.\nApoyar despliegues locales y pruebas.',
      city: 'Medellín, Colombia',
      modality: 'Híbrido',
      contractType: 'Término indefinido',
      salaryMin: 3500000,
      salaryMax: 4500000,
      currency: 'COP',
      skillsRequired: 'Ingeniería de software, Angular, NestJS, PostgreSQL, Git, Docker, Pruebas',
      status: 'PUBLISHED',
    },
  ];

  let jobCount = 0;
  for (const job of jobs) {
    const created = await prisma.jobOffer.create({
      data: {
        companyId: user.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        city: job.city,
        modality: job.modality,
        contractType: job.contractType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        skillsRequired: job.skillsRequired,
        status: job.status as any,
        publishedAt: new Date(),
      },
    });
    jobCount++;
  }
  console.log(`  ✓  Vacantes: ${jobCount} creadas`);

  // 4. Applications from Santiago
  const santiago = await prisma.user.findUnique({
    where: { email: 'bustamantemolinasantiago@gmail.com' },
  });

  if (santiago) {
    const companyJobs = await prisma.$queryRawUnsafe<Array<{id: number, title: string}>>(
      `SELECT id, title FROM job_offers WHERE company_id = $1 AND status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 2`,
      user.id
    );

    let appCount = 0;
    for (let i = 0; i < companyJobs.length; i++) {
      const existing = await prisma.jobApplication.findUnique({
        where: { jobOfferId_candidateId: { jobOfferId: companyJobs[i].id, candidateId: santiago.id } },
      });
      if (!existing) {
        await prisma.jobApplication.create({
          data: {
            jobOfferId: companyJobs[i].id,
            candidateId: santiago.id,
            coverMessage: 'Adjunto mi perfil para esta vacante. Tengo experiencia con las tecnologías solicitadas.',
            status: i === 0 ? 'PENDING' : 'REVIEWED',
          },
        });
        appCount++;
      }
    }
    console.log(`  ✓  Postulaciones de Santiago: ${appCount} creadas`);

    // 5. Chat demo - empresa inicia
    let conversation = await prisma.conversation.findUnique({
      where: { candidateId_companyId: { candidateId: santiago.id, companyId: user.id } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { candidateId: santiago.id, companyId: user.id, lastMessageAt: new Date() },
      });
    } else {
      await prisma.chatMessage.deleteMany({ where: { conversationId: conversation.id } });
    }

    const messages = [
      { senderId: user.id, body: 'Hola Santiago, revisamos tu perfil Full Stack y nos gustaría conocer más sobre tu experiencia con Angular, NestJS y PostgreSQL.' },
      { senderId: santiago.id, body: 'Hola, muchas gracias por contactarme. Con gusto puedo compartir más detalles sobre mis proyectos y experiencia técnica.' },
      { senderId: user.id, body: 'Perfecto. Te tendremos en cuenta para continuar con el proceso de selección.' },
    ];

    for (const msg of messages) {
      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, ...msg },
      });
    }
    console.log('  ✓  Conversación demo creada (3 mensajes, empresa inicia)');
  } else {
    console.log('  ⚠  Santiago no encontrado, postulaciones y chat omitidos');
  }

  const jobTotal = await prisma.jobOffer.count({ where: { companyId: user.id } });
  console.log('\n--- RESUMEN ---');
  console.log(`  Empresa:       ${profile.companyName}`);
  console.log(`  Email:         ${user.email}`);
  console.log(`  Sector:        ${profile.sector}`);
  console.log(`  Ciudad:        ${profile.city}`);
  console.log(`  Vacantes:      ${jobTotal}`);
  console.log('\n✅ Seed de empresa demo completado!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
