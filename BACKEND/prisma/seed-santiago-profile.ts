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
  console.log('\n🚀 Seed del perfil Santiago Bustamante\n');

  const email = 'bustamantemolinasantiago@gmail.com';
  const password = 'Santiago.123';
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: UserRole.CANDIDATE },
    create: { email, passwordHash, role: UserRole.CANDIDATE },
  });
  console.log(`  ✓  Usuario: ${user.email} (id: ${user.id}, role: ${user.role})`);

  // 2. Upsert Profile
  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      fullName: 'Santiago Bustamante Molina',
      professionalTitle: 'Ingeniero de Sistemas | Desarrollador Full Stack',
      summary: 'Ingeniero de Sistemas en formación con enfoque en desarrollo Full Stack, construcción de aplicaciones web modernas y soluciones tecnológicas escalables. Tengo conocimientos en Angular, NestJS, TypeScript, PostgreSQL, Prisma, Docker, Git y consumo de APIs REST. Me interesa participar en proyectos donde pueda integrar frontend, backend, bases de datos y buenas prácticas de arquitectura de software. Me caracterizo por ser responsable, autodidacta, analítico y orientado a la solución de problemas.',
      phone: '+57 300 789 4561',
      city: 'Bogotá, Colombia',
      photoUrl: 'https://ui-avatars.com/api/?name=Santiago+Bustamante&size=256&background=2563eb&color=fff',
      linkedinUrl: 'https://linkedin.com/in/santiago-bustamante-fullstack',
      githubUrl: 'https://github.com/santiago-bustamante-dev',
      websiteUrl: 'https://santiago-bustamante.dev',
      slug: 'santiago-bustamante',
      isPublished: true,
      showPhone: true,
      showCity: true,
      showLinkedin: true,
      showGithub: true,
      showWebsite: true,
      showExperience: true,
      showEducation: true,
      showProjects: true,
      showSkills: true,
    },
    create: {
      userId: user.id,
      fullName: 'Santiago Bustamante Molina',
      professionalTitle: 'Ingeniero de Sistemas | Desarrollador Full Stack',
      summary: 'Ingeniero de Sistemas en formación con enfoque en desarrollo Full Stack, construcción de aplicaciones web modernas y soluciones tecnológicas escalables. Tengo conocimientos en Angular, NestJS, TypeScript, PostgreSQL, Prisma, Docker, Git y consumo de APIs REST. Me interesa participar en proyectos donde pueda integrar frontend, backend, bases de datos y buenas prácticas de arquitectura de software. Me caracterizo por ser responsable, autodidacta, analítico y orientado a la solución de problemas.',
      phone: '+57 300 789 4561',
      city: 'Bogotá, Colombia',
      photoUrl: 'https://ui-avatars.com/api/?name=Santiago+Bustamante&size=256&background=2563eb&color=fff',
      linkedinUrl: 'https://linkedin.com/in/santiago-bustamante-fullstack',
      githubUrl: 'https://github.com/santiago-bustamante-dev',
      websiteUrl: 'https://santiago-bustamante.dev',
      slug: 'santiago-bustamante',
      isPublished: true,
      showPhone: true,
      showCity: true,
      showLinkedin: true,
      showGithub: true,
      showWebsite: true,
      showExperience: true,
      showEducation: true,
      showProjects: true,
      showSkills: true,
    },
  });
  console.log(`  ✓  Perfil: ${profile.fullName} (slug: ${profile.slug})`);

  // 3. Skills - delete and recreate
  await prisma.skill.deleteMany({ where: { profileId: profile.id } });

  const skills = [
    { name: 'Angular', level: 'INTERMEDIATE' },
    { name: 'NestJS', level: 'INTERMEDIATE' },
    { name: 'TypeScript', level: 'INTERMEDIATE' },
    { name: 'PostgreSQL', level: 'INTERMEDIATE' },
    { name: 'Docker', level: 'BASIC' },
    { name: 'Git y GitHub', level: 'INTERMEDIATE' },
  ];

  for (const s of skills) {
    await prisma.skill.create({
      data: {
        profileId: profile.id,
        name: s.name,
        normalizedName: s.name.toLowerCase(),
        level: s.level,
      },
    });
  }
  console.log(`  ✓  Habilidades: ${skills.length} creadas`);

  // 4. Experiences - delete and recreate
  await prisma.experience.deleteMany({ where: { profileId: profile.id } });

  const experiences = [
    {
      company: 'TalentBridge Labs',
      position: 'Desarrollador Full Stack Junior',
      city: 'Bogotá, Colombia',
      workMode: 'Híbrido',
      contractType: 'Término indefinido',
      description: 'Experiencia enfocada en desarrollo Full Stack de plataformas web modernas, integrando frontend, backend, base de datos y autenticación para sistemas empresariales.',
      functions: 'Desarrollo de interfaces web con Angular, creación de componentes reutilizables, consumo de APIs REST, implementación de rutas protegidas, desarrollo de servicios backend con NestJS, modelado de datos con Prisma y conexión a PostgreSQL.',
      achievements: 'Contribuí al desarrollo de módulos de perfil profesional, vacantes, postulaciones y dashboard. Mejoré la integración entre frontend y backend, y apoyé la estabilización de flujos de autenticación y roles.',
      tools: 'Angular, TypeScript, NestJS, Prisma, PostgreSQL, Docker, Git, GitHub, Swagger, Postman, Visual Studio Code',
      learnedSkills: ['Arquitectura modular', 'APIs REST', 'Autenticación JWT', 'Manejo de roles', 'Documentación técnica', 'Trabajo con bases de datos relacionales'],
      startDate: new Date('2025-01-01'),
      endDate: null,
      isCurrent: true,
    },
    {
      company: 'Soluciones Digitales Andinas S.A.S.',
      position: 'Practicante de Ingeniería de Software',
      city: 'Medellín, Colombia',
      workMode: 'Presencial',
      contractType: 'Prácticas',
      description: 'Práctica profesional orientada al apoyo en análisis, desarrollo, pruebas y documentación de aplicaciones web empresariales.',
      functions: 'Apoyo en levantamiento de requerimientos, diseño de interfaces, validación de formularios, consumo de servicios REST, ejecución de pruebas funcionales y elaboración de documentación técnica.',
      achievements: 'Apoyé la mejora de formularios internos, reduje errores de validación y contribuí a la documentación de procesos técnicos para facilitar el mantenimiento del sistema.',
      tools: 'HTML, CSS, JavaScript, Angular, Postman, Git, Trello, Visual Studio Code, Microsoft Teams',
      learnedSkills: ['Análisis de requerimientos', 'Pruebas funcionales', 'Documentación técnica', 'Control de versiones', 'Comunicación con equipos', 'Buenas prácticas de programación'],
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-12-31'),
      isCurrent: false,
    },
    {
      company: 'Proyectos Independientes',
      position: 'Desarrollador Web Freelance',
      city: 'Remoto',
      workMode: 'Remoto',
      contractType: 'Freelance',
      description: 'Desarrollo de soluciones web para pequeños negocios y proyectos académicos, aplicando tecnologías frontend, backend básico y bases de datos relacionales.',
      functions: 'Diseño de páginas web responsivas, creación de formularios, implementación de navegación, configuración de bases de datos simples, integración de funcionalidades administrativas y despliegues básicos.',
      achievements: 'Entregué soluciones digitales funcionales para pequeños negocios, mejorando su presencia en línea y automatizando procesos básicos de registro, consulta y presentación de información.',
      tools: 'HTML, CSS, JavaScript, Angular, Node.js, PostgreSQL, Bootstrap, GitHub Pages, Visual Studio Code',
      learnedSkills: ['Gestión de proyectos pequeños', 'Comunicación con clientes', 'Diseño responsive', 'Solución de problemas', 'Autonomía', 'Adaptación a necesidades del usuario'],
      startDate: new Date('2023-06-01'),
      endDate: new Date('2024-01-31'),
      isCurrent: false,
    },
  ];

  for (const exp of experiences) {
    await prisma.experience.create({
      data: { ...exp, profileId: profile.id },
    });
  }
  console.log(`  ✓  Experiencias: ${experiences.length} creadas`);

  // 5. Education - delete and recreate
  await prisma.education.deleteMany({ where: { profileId: profile.id } });

  const educations = [
    {
      institution: 'Universidad Cooperativa de Colombia',
      degree: 'Ingeniería de Sistemas',
      fieldOfStudy: 'Ingeniería de Software',
      educationType: 'FORMAL',
      formationLevel: 'Universidad',
      description: 'Formación profesional en programación, estructuras de datos, bases de datos, ingeniería de software, arquitectura de sistemas, redes, seguridad informática y desarrollo de aplicaciones web.',
      startDate: new Date('2021-01-01'),
      endDate: new Date('2025-12-31'),
      isCurrent: false,
    },
    {
      institution: 'SENA',
      degree: 'Curso Complementario en Desarrollo Web Full Stack',
      fieldOfStudy: 'Desarrollo Web',
      educationType: 'FORMAL',
      formationLevel: 'Técnico',
      description: 'Formación práctica en HTML, CSS, JavaScript, consumo de APIs, control de versiones con Git y fundamentos de backend con Node.js.',
      startDate: new Date('2023-03-01'),
      endDate: new Date('2023-07-31'),
      isCurrent: false,
    },
  ];

  for (const edu of educations) {
    await prisma.education.create({
      data: { ...edu, profileId: profile.id },
    });
  }
  console.log(`  ✓  Educación: ${educations.length} registros creados`);

  // 6. Projects - delete and recreate
  await prisma.project.deleteMany({ where: { profileId: profile.id } });

  const projects = [
    {
      name: 'TalentBridge - Plataforma de Portafolio Profesional',
      description: 'Plataforma web para conectar candidatos y empresas mediante perfiles profesionales, portafolios públicos, vacantes, postulaciones, chat y dashboard por roles.',
      role: 'Desarrollador Full Stack',
      technologies: ['Angular', 'NestJS', 'PostgreSQL', 'Prisma', 'Docker', 'JWT'],
      repositoryUrl: 'https://github.com/santiago-bustamante-dev/talentbridge',
      demoUrl: 'https://talentbridge-demo.example.com',
      projectType: 'Web',
      status: 'En desarrollo',
    },
    {
      name: 'Sistema de Gestión de Vacantes Full Stack',
      description: 'Aplicación web para que empresas publiquen ofertas laborales y candidatos puedan consultar, filtrar y postularse a vacantes.',
      role: 'Desarrollador Full Stack',
      technologies: ['Angular', 'TypeScript', 'NestJS', 'PostgreSQL', 'Prisma'],
      repositoryUrl: 'https://github.com/santiago-bustamante-dev/sistema-vacantes',
      demoUrl: 'https://vacantes-fullstack.example.com',
      projectType: 'Web',
      status: 'Completado',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-01'),
    },
    {
      name: 'API REST para Gestión Académica',
      description: 'API backend para administrar estudiantes, cursos, matrículas y reportes académicos, con autenticación JWT y validación de roles.',
      role: 'Backend Developer',
      technologies: ['NestJS', 'PostgreSQL', 'Prisma', 'JWT', 'Swagger'],
      repositoryUrl: 'https://github.com/santiago-bustamante-dev/api-academica',
      demoUrl: 'https://api-academica.example.com',
      projectType: 'API',
      status: 'Completado',
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-08-01'),
    },
    {
      name: 'Dashboard de Indicadores en Angular',
      description: 'Panel administrativo con métricas, tarjetas de resumen, gráficos y filtros para visualizar información de productividad y gestión.',
      role: 'Frontend Developer',
      technologies: ['Angular', 'TypeScript', 'Chart.js', 'REST API', 'CSS'],
      repositoryUrl: 'https://github.com/santiago-bustamante-dev/dashboard-indicadores',
      demoUrl: 'https://dashboard-angular.example.com',
      projectType: 'Web',
      status: 'Completado',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-05-01'),
    },
  ];

  for (const proj of projects) {
    await prisma.project.create({
      data: { ...proj, profileId: profile.id },
    });
  }
  console.log(`  ✓  Proyectos: ${projects.length} creados`);

  // 7. CV - SKIP (requires real file upload)
  console.log('  ⏭  CV: omitido (subir archivo real desde el frontend)');

  // 8. Applications - use raw query to avoid enum type issues
  const jobs = await prisma.$queryRawUnsafe<Array<{id:number, title:string}>>(
    `SELECT id, title FROM job_offers WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 2`
  );

  let appCount = 0;
  for (let i = 0; i < jobs.length; i++) {
    const existing = await prisma.jobApplication.findUnique({
      where: { jobOfferId_candidateId: { jobOfferId: jobs[i].id, candidateId: user.id } },
    });
    if (!existing) {
      await prisma.jobApplication.create({
        data: {
          jobOfferId: jobs[i].id,
          candidateId: user.id,
          coverMessage: 'Me interesa esta vacante porque se alinea con mi perfil Full Stack y mi experiencia con Angular, NestJS y PostgreSQL.',
          status: i === 0 ? 'PENDING' : 'REVIEWED',
        },
      });
      appCount++;
    }
  }
  console.log(`  ✓  Postulaciones: ${appCount} creadas`);

  // 9. Chat demo - empresa inicia la conversación (NO el candidato)
  const empresa = await prisma.user.findUnique({ where: { email: 'empresa001@demo.com' } });

  if (empresa) {
    let conversation = await prisma.conversation.findUnique({
      where: { candidateId_companyId: { candidateId: user.id, companyId: empresa.id } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { candidateId: user.id, companyId: empresa.id, lastMessageAt: new Date() },
      });
    } else {
      await prisma.chatMessage.deleteMany({ where: { conversationId: conversation.id } });
    }

    const messages = [
      { senderId: empresa.id, body: 'Hola Santiago, revisamos tu perfil Full Stack y nos gustaría conocer más sobre tu experiencia con Angular, NestJS y PostgreSQL.' },
      { senderId: user.id, body: 'Hola, muchas gracias por contactarme. Con gusto puedo compartir más detalles sobre mis proyectos y experiencia técnica.' },
      { senderId: empresa.id, body: 'Perfecto. Te tendremos en cuenta para continuar con el proceso de selección.' },
    ];

    for (const msg of messages) {
      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, ...msg },
      });
      await new Promise((r) => setTimeout(r, 10));
    }
    console.log(`  ✓  Chat demo creado (3 mensajes, iniciado por empresa)`);
  } else {
    console.log('  ⚠  empresa001@demo.com no encontrada, chat omitido');
  }

  // Summary
  const skillCount = await prisma.skill.count({ where: { profileId: profile.id } });
  const expCount = await prisma.experience.count({ where: { profileId: profile.id } });
  const eduCount = await prisma.education.count({ where: { profileId: profile.id } });
  const projCount = await prisma.project.count({ where: { profileId: profile.id } });

  console.log('\n--- RESUMEN ---');
  console.log(`  Usuario:         ${user.email}`);
  console.log(`  Rol:             ${user.role}`);
  console.log(`  Perfil:          ${profile.fullName}`);
  console.log(`  Slug público:    /portfolio/${profile.slug}`);
  console.log(`  Habilidades:     ${skillCount}`);
  console.log(`  Experiencias:    ${expCount}`);
  console.log(`  Educación:       ${eduCount}`);
  console.log(`  Proyectos:       ${projCount}`);
  console.log('\n✅ Seed completado!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
