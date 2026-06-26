import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { UserRole } from '../libs/database/src/generated/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = randomInt(min, Math.min(max, arr.length));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const levels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
const levelWeights = [0.1, 0.3, 0.4, 0.2];

function weightedLevel(): string {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < levelWeights.length; i++) {
    cum += levelWeights[i];
    if (r <= cum) return levels[i];
  }
  return 'INTERMEDIATE';
}

function generatePhone(): string {
  const prefix = randomPick(['310', '311', '312', '314', '315', '316', '317', '318', '319', '300', '301', '302', '304', '305']);
  const part1 = String(randomInt(100, 999));
  const part2 = String(randomInt(1000, 9999));
  return `${prefix} ${part1} ${part2}`;
}

const professions = [
  { title: 'Mecánico automotriz', skills: ['Diagnóstico automotriz', 'Mantenimiento preventivo', 'Sistemas de frenos', 'Cambio de aceite', 'Suspensión', 'Electricidad automotriz', 'Alineación y balanceo'] },
  { title: 'Médico general', skills: ['Atención primaria', 'Historia clínica', 'Urgencias', 'Consulta externa', 'Promoción y prevención', 'Inyectología'] },
  { title: 'Veterinario', skills: ['Medicina preventiva', 'Cirugía menor', 'Atención de mascotas', 'Vacunación', 'Diagnóstico clínico', 'Nutrición animal'] },
  { title: 'Ingeniero de sistemas', skills: ['Angular', 'NestJS', 'PostgreSQL', 'APIs REST', 'Git', 'Docker', 'TypeScript', 'Python'] },
  { title: 'Ingeniero civil', skills: ['AutoCAD', 'Estructuras', 'Supervisión de obra', 'Presupuestos', 'Topografía', 'Gestión de proyectos'] },
  { title: 'Ingeniero industrial', skills: ['Mejora continua', 'Logística', 'Control de calidad', 'Gestión de procesos', 'Lean Manufacturing', 'ISO 9001'] },
  { title: 'Mesero', skills: ['Servicio al cliente', 'Toma de pedidos', 'Manejo de bandeja', 'Caja básica', 'Atención en restaurantes'] },
  { title: 'Cocinero', skills: ['Cocina nacional', 'Manejo de ollas', 'Preparación de menús', 'Control de inventarios', 'Higiene alimentaria'] },
  { title: 'Auxiliar de cocina', skills: ['Preparación de alimentos', 'Limpieza de cocina', 'Apoyo al chef', 'Manipulación de alimentos'] },
  { title: 'Contador', skills: ['Contabilidad general', 'Declaración de renta', 'Nómina', 'Impuestos', 'Estados financieros', 'Excel avanzado'] },
  { title: 'Administrador de empresas', skills: ['Gestión administrativa', 'Planeación estratégica', 'Finanzas', 'Recursos humanos', 'Liderazgo de equipos'] },
  { title: 'Diseñador gráfico', skills: ['Photoshop', 'Illustrator', 'Figma', 'Diseño editorial', 'Branding', 'Redes sociales'] },
  { title: 'Desarrollador web', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'Figma', 'Responsive Design'] },
  { title: 'Enfermero', skills: ['Cuidado de pacientes', 'Toma de signos vitales', 'Curaciones', 'Administración de medicamentos', 'Soporte vital básico'] },
  { title: 'Psicólogo', skills: ['Psicología clínica', 'Terapia cognitiva', 'Evaluación psicológica', 'Orientación vocacional', 'Manejo de grupos'] },
  { title: 'Docente', skills: ['Pedagogía', 'Planeación de clases', 'Evaluación educativa', 'Manejo de grupos', 'TIC educativas'] },
  { title: 'Electricista', skills: ['Instalaciones eléctricas', 'Mantenimiento preventivo', 'Tableros eléctricos', 'Redes trifásicas', 'Normas RETIE'] },
  { title: 'Técnico en refrigeración', skills: ['Refrigeración comercial', 'Aire acondicionado', 'Mantenimiento de compresores', 'Soldadura', 'Diagnóstico de fallas'] },
  { title: 'Soldador', skills: ['Soldadura eléctrica', 'Soldadura MIG', 'Soldadura TIG', 'Lectura de planos', 'Corte de metales'] },
  { title: 'Arquitecto', skills: ['Diseño arquitectónico', 'AutoCAD', 'Revit', 'SketchUp', 'Renderizado 3D', 'Gestión de obra'] },
  { title: 'Abogado', skills: ['Derecho laboral', 'Derecho civil', 'Contratos', 'Litigios', 'Asesoría jurídica', 'Derecho comercial'] },
  { title: 'Auxiliar administrativo', skills: ['Atención al cliente', 'Manejo de office', 'Archivo', 'Digitación', 'Agenda telefónica'] },
  { title: 'Conductor', skills: ['Licencia C1', 'Manejo defensivo', 'Logística de transporte', 'Rutas nacionales', 'Mantenimiento básico'] },
  { title: 'Operario logístico', skills: ['Manejo de inventarios', 'Montacargas', 'Picking y packing', 'Control de bodega', 'ERP básico'] },
  { title: 'Vendedor', skills: ['Ventas directas', 'Atención al cliente', 'Manejo de caja', 'Negociación', 'Metas comerciales'] },
  { title: 'Community manager', skills: ['Redes sociales', 'Creación de contenido', 'Meta Ads', 'Copywriting', 'Fotografía básica', 'Analítica digital'] },
  { title: 'Fotógrafo', skills: ['Fotografía digital', 'Lightroom', 'Photoshop', 'Fotografía de eventos', 'Fotografía de producto'] },
  { title: 'Barbero', skills: ['Corte de cabello', 'Barba', 'Afeitado clásico', 'Atención al cliente', 'Técnicas de barbería'] },
  { title: 'Estilista', skills: ['Corte de dama', 'Colorimetría', 'Peinados', 'Alisados', 'Tratamientos capilares'] },
  { title: 'Técnico en sistemas', skills: ['Mantenimiento de computadores', 'Redes', 'Windows Server', 'Soporte técnico', 'Help desk'] },
];

const firstNames = ['Carlos', 'María', 'Juan', 'Ana', 'Luis', 'Diana', 'Pedro', 'Sofía', 'Jorge', 'Camila', 'Andrés', 'Laura', 'Diego', 'Valentina', 'Fernando', 'Natalia', 'Ricardo', 'Gabriela', 'Oscar', 'Paola', 'Miguel', 'Daniela', 'Alejandro', 'Carolina', 'Javier', 'Marcela', 'Cristian', 'Andrea', 'Manuel', 'Liliana'];
const lastNames1 = ['Méndez', 'García', 'Rodríguez', 'López', 'Martínez', 'Hernández', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Díaz', 'Ortiz', 'Morales', 'Ruiz', 'Jiménez', 'Castro', 'Rojas'];
const lastNames2 = ['Vargas', 'Castillo', 'Gutiérrez', 'Romero', 'Medina', 'Herrera', 'Cruz', 'Suárez', 'Guerrero', 'Peña', 'Parra', 'Marín', 'Restrepo', 'Osorio', 'Rincón', 'Arias', 'Navarro', 'Salazar', 'Blanco', 'Cárdenas'];
const cities = ['Villavicencio', 'Bogotá', 'Medellín', 'Cali', 'Bucaramanga', 'Barranquilla', 'Pereira', 'Cúcuta', 'Ibagué', 'Cartagena'];

const institutions = [
  'Universidad Nacional de Colombia', 'Universidad de los Andes',
  'Pontificia Universidad Javeriana', 'Universidad del Rosario',
  'SENA', 'Universidad de Antioquia', 'Universidad del Valle',
  'Universidad Industrial de Santander', 'Universidad del Norte',
  'Universidad Tecnológica de Pereira', 'Universidad de la Sabana',
  'Universidad Externado de Colombia', 'Universidad EAFIT',
  'Universidad ICESI', 'Politécnico Grancolombiano',
  'Universidad Cooperativa de Colombia', 'Universidad de Cartagena',
  'Universidad Santo Tomás', 'Fundación Universitaria del Área Andina',
  'Corporación Universitaria Minuto de Dios',
];

const employerPool: Record<string, string[]> = {
  'Mecánico automotriz': ['Taller Automotriz Los Andes', 'Autolab Colombia', 'Servicio Técnico Premium', 'Taller El Maestro', 'Centro Automotriz Nacional'],
  'Médico general': ['Clínica del Country', 'Hospital San Ignacio', 'EPS Sura', 'Clínica Colsanitas', 'Fundación Santa Fe'],
  'Veterinario': ['Clínica Veterinaria PetCare', 'Agro veterinaria El Corral', 'Zoológico de Cali', 'Fundación animalista Huella', 'Veterinaria La Salle'],
  'Ingeniero de sistemas': ['Globant', 'Mercado Libre', 'Sophos Solutions', 'PSL', 'Endava'],
  'Ingeniero civil': ['Constructora Bolívar', 'Conconcreto', 'Odinsa', 'Argos', 'ANi'],
  'Ingeniero industrial': ['Grupo Nutresa', 'Bavaria', 'Postobón', 'Alpina', 'Quala'],
  'Mesero': ['Restaurante Andrés Carne de Res', 'Crepes & Waffles', 'Hotel Hilton', 'Club El Nogal', 'Zona Gourmet'],
  'Cocinero': ['Restaurante Leo', 'Hotel Tequendama', 'Crepes & Waffles', 'La Fragata', 'Casa San Isidro'],
  'Auxiliar de cocina': ['Corral Gourmet', 'Hotel Estelar', 'Restaurante Wok', 'Frisby', 'Mimo\'s'],
  'Contador': ['Deloitte', 'PwC', 'KPMG', 'EY', 'Crowe'],
  'Administrador de empresas': ['Bancolombia', 'Grupo Éxito', 'Avianca', 'Colsubsidio', 'Compensar'],
  'Diseñador gráfico': ['Sancho BBDO', 'DDB Colombia', 'Leo Burnett', 'McCann', 'Ogilvy'],
  'Desarrollador web': ['Globant', 'Mercado Libre', 'Sophos Solutions', 'Endava', 'NTT Data'],
  'Enfermero': ['Clínica del Country', 'Hospital Militar', 'EPS Sura', 'Clínica Colsanitas', 'Cruz Roja Colombiana'],
  'Psicólogo': ['Colegio Los Nogales', 'Universidad de los Andes', 'Clínica de la Paz', 'Fundación Coomeva', 'Consultorio particular'],
  'Docente': ['Colegio Los Nogales', 'Colegio San Carlos', 'Universidad Minuto de Dios', 'SENA', 'Colegio Gimnasio Moderno'],
  'Electricista': ['Codensa', 'EPM', 'Electricaribe', 'Electrohuila', 'Conelsa'],
  'Técnico en refrigeración': ['Refricol', 'Frío Express', 'ServiFrío', 'ClimaCool', 'Refrimax'],
  'Soldador': ['Industrias Metálicas', 'Taller El Soldador', 'MetalMecánica Andina', 'Construcciones Metálicas', 'Siderúrgica Nacional'],
  'Arquitecto': ['Constructora Bolívar', 'Amarilo', 'Conconcreto', 'Urbanas', 'Diseño y Espacio'],
  'Abogado': ['Baker McKenzie', 'Brigard Urrutia', 'Posse Herrera Ruiz', 'Gómez-Pinzón', 'Consultorio jurídico'],
  'Auxiliar administrativo': ['Bancolombia', 'Grupo Éxito', 'Cafam', 'Colsubsidio', 'Compensar'],
  'Conductor': ['Servientrega', 'Coordinadora', 'Transportes Sánchez', 'Cooperativa de Transportadores', 'Logística Total'],
  'Operario logístico': ['Almacenes Éxito', 'Alkosto', 'Falabella', 'DHL', 'Servientrega'],
  'Vendedor': ['Falabella', 'Alkosto', 'Éxito', 'Tiendas D1', 'Ara'],
  'Community manager': ['Sancho BBDO', 'MediaCom', 'Havas Media', 'Agencia Digital', 'Freelance'],
  'Fotógrafo': ['Revista Semana', 'El Tiempo', 'Freelance', 'Estudio Fotográfico', 'Agencia de Publicidad'],
  'Barbero': ['Barbería El Patrón', 'The Barbers', 'Club del Barbero', 'Barba Negra', 'Freelance'],
  'Estilista': ['Spa Salón', 'Peluquería Glamour', 'L\'Oréal', 'Salón de Belleza', 'Estudio de Imagen'],
  'Técnico en sistemas': ['CompuTrabajo', 'Soporte Digital', 'TechServices', 'MegaTecnología', 'Sistemas Integrales'],
};

function getDegree(professionTitle: string): { degree: string; fieldOfStudy: string; formationLevel: string } {
  const map: Record<string, { degree: string; fieldOfStudy: string; formationLevel: string }> = {
    'Mecánico automotriz': { degree: 'Técnico Profesional', fieldOfStudy: 'Mecánica Automotriz', formationLevel: 'Técnico' },
    'Médico general': { degree: 'Pregrado', fieldOfStudy: 'Medicina', formationLevel: 'Universidad' },
    'Veterinario': { degree: 'Pregrado', fieldOfStudy: 'Medicina Veterinaria', formationLevel: 'Universidad' },
    'Ingeniero de sistemas': { degree: 'Pregrado', fieldOfStudy: 'Ingeniería de Sistemas', formationLevel: 'Universidad' },
    'Ingeniero civil': { degree: 'Pregrado', fieldOfStudy: 'Ingeniería Civil', formationLevel: 'Universidad' },
    'Ingeniero industrial': { degree: 'Pregrado', fieldOfStudy: 'Ingeniería Industrial', formationLevel: 'Universidad' },
    'Mesero': { degree: 'Bachiller', fieldOfStudy: 'Bachillerato Académico', formationLevel: 'Bachillerato' },
    'Cocinero': { degree: 'Técnico', fieldOfStudy: 'Gastronomía', formationLevel: 'Técnico' },
    'Auxiliar de cocina': { degree: 'Bachiller', fieldOfStudy: 'Bachillerato Académico', formationLevel: 'Bachillerato' },
    'Contador': { degree: 'Pregrado', fieldOfStudy: 'Contaduría Pública', formationLevel: 'Universidad' },
    'Administrador de empresas': { degree: 'Pregrado', fieldOfStudy: 'Administración de Empresas', formationLevel: 'Universidad' },
    'Diseñador gráfico': { degree: 'Pregrado', fieldOfStudy: 'Diseño Gráfico', formationLevel: 'Universidad' },
    'Desarrollador web': { degree: 'Pregrado', fieldOfStudy: 'Ingeniería de Sistemas', formationLevel: 'Universidad' },
    'Enfermero': { degree: 'Pregrado', fieldOfStudy: 'Enfermería', formationLevel: 'Universidad' },
    'Psicólogo': { degree: 'Pregrado', fieldOfStudy: 'Psicología', formationLevel: 'Universidad' },
    'Docente': { degree: 'Pregrado', fieldOfStudy: 'Licenciatura en Educación', formationLevel: 'Universidad' },
    'Electricista': { degree: 'Técnico', fieldOfStudy: 'Electricidad Industrial', formationLevel: 'Técnico' },
    'Técnico en refrigeración': { degree: 'Técnico', fieldOfStudy: 'Refrigeración y Climatización', formationLevel: 'Técnico' },
    'Soldador': { degree: 'Técnico', fieldOfStudy: 'Soldadura Industrial', formationLevel: 'Técnico' },
    'Arquitecto': { degree: 'Pregrado', fieldOfStudy: 'Arquitectura', formationLevel: 'Universidad' },
    'Abogado': { degree: 'Pregrado', fieldOfStudy: 'Derecho', formationLevel: 'Universidad' },
    'Auxiliar administrativo': { degree: 'Técnico', fieldOfStudy: 'Asistencia Administrativa', formationLevel: 'Técnico' },
    'Conductor': { degree: 'Bachiller', fieldOfStudy: 'Conducción y Transporte', formationLevel: 'Bachillerato' },
    'Operario logístico': { degree: 'Técnico', fieldOfStudy: 'Logística', formationLevel: 'Técnico' },
    'Vendedor': { degree: 'Bachiller', fieldOfStudy: 'Ventas y Mercadeo', formationLevel: 'Bachillerato' },
    'Community manager': { degree: 'Pregrado', fieldOfStudy: 'Comunicación Social', formationLevel: 'Universidad' },
    'Fotógrafo': { degree: 'Técnico', fieldOfStudy: 'Fotografía Profesional', formationLevel: 'Técnico' },
    'Barbero': { degree: 'Técnico', fieldOfStudy: 'Barbería Profesional', formationLevel: 'Técnico' },
    'Estilista': { degree: 'Técnico', fieldOfStudy: 'Estilismo y Belleza', formationLevel: 'Técnico' },
    'Técnico en sistemas': { degree: 'Técnico', fieldOfStudy: 'Sistemas y Computación', formationLevel: 'Técnico' },
  };
  return map[professionTitle] ?? { degree: 'Técnico', fieldOfStudy: professionTitle, formationLevel: 'Técnico' };
}

function generateSummary(title: string, years: number, skills: string[], city: string): string {
  const templates = [
    `Profesional en ${title} con ${years} años de experiencia en el sector. Especializado en ${skills.slice(0, 3).join(', ')}. Resido en ${city} y busco nuevas oportunidades laborales donde pueda aplicar mis conocimientos y seguir creciendo profesionalmente.`,
    `Soy ${title} con trayectoria comprobada de ${years} años en ${city}. Mis principales habilidades incluyen ${skills.slice(0, 3).join(', ')}. Me caracterizo por mi compromiso, responsabilidad y orientación a resultados.`,
    `${title} apasionado con ${years} años de experiencia. Amplio conocimiento en ${skills.slice(0, 3).join(', ')}. Busco integrarme a un equipo de trabajo estable donde pueda aportar mis competencias y desarrollarme profesionalmente.`,
    `Dedicado ${title} residente en ${city} con ${years} años de trayectoria. Experiencia destacada en ${skills.slice(0, 2).join(' y ')}. Comprometido con la excelencia y el mejoramiento continuo en cada proyecto que emprendo.`,
    `Experto en ${title} con más de ${years} años de experiencia laboral. Habilidades sólidas en ${skills.slice(0, 3).join(', ')}. En ${city}, he construido una carrera basada en la calidad, la ética profesional y la satisfacción del cliente.`,
  ];
  return randomPick(templates);
}

function generateExperienceDescription(professionTitle: string, skills: string[]): string {
  const skill1 = randomPick(skills);
  const skill2 = randomPick(skills.filter(s => s !== skill1));
  const templates = [
    `Responsable de ejecutar tareas de ${professionTitle.toLowerCase()} aplicando ${skill1} y ${skill2}. Logré mejoras significativas en los procesos del área.`,
    `Desempeñé el cargo con enfoque en ${skill1}, logrando optimizar resultados y cumplir metas establecidas por la organización.`,
    `Participé activamente en proyectos de ${professionTitle.toLowerCase()}, destacándome por mi dominio de ${skill1} y capacidad para trabajar en equipo.`,
    `Lideré iniciativas de mejora utilizando ${skill1}, lo que permitió incrementar la eficiencia operativa en un porcentaje significativo.`,
  ];
  return randomPick(templates);
}

function generateCompanyPosition(professionTitle: string, yearsExp: number): string {
  if (yearsExp <= 3) return `Auxiliar de ${professionTitle.toLowerCase()}`;
  if (yearsExp <= 6) return professionTitle;
  if (yearsExp <= 10) return `${professionTitle} Senior`;
  return `Jefe de ${professionTitle.toLowerCase()}`;
}

const workModes = ['ONSITE', 'REMOTE', 'HYBRID'];

function generateExperiences(professionTitle: string, skills: string[], yearsExp: number, city: string) {
  const experiences: Array<{
    company: string;
    position: string;
    city: string;
    workMode: string;
    contractType: string;
    description: string;
    functions: string;
    achievements: string;
    tools: string;
    learnedSkills: string[];
    startDate: Date;
    endDate: Date | null;
    isCurrent: boolean;
  }> = [];

  const employers = employerPool[professionTitle] ?? ['Empresa Nacional S.A.S.', 'Corporación Colombiana', 'Industrias Unidas'];
  const now = new Date();

  const exp1Start = randomDate(
    new Date(now.getFullYear() - yearsExp - 2, 0, 1),
    new Date(now.getFullYear() - yearsExp + 1, 0, 1),
  );
  const exp1End = new Date(exp1Start.getFullYear() + randomInt(1, Math.max(2, yearsExp - 2)), randomInt(0, 11), randomInt(1, 28));
  if (exp1End > now) exp1End.setTime(now.getTime());

  const learnedSkillsSubset = randomSubset(skills, 1, Math.min(3, skills.length));

  experiences.push({
    company: randomPick(employers),
    position: generateCompanyPosition(professionTitle, Math.max(1, Math.floor(yearsExp * 0.6))),
    city: randomPick(cities),
    workMode: randomPick(workModes),
    contractType: 'FULL_TIME',
    description: generateExperienceDescription(professionTitle, skills),
    functions: `Responsable de las tareas de ${professionTitle.toLowerCase()} en la organización.`,
    achievements: `Cumplimiento de metas y objetivos del área de ${professionTitle.toLowerCase()}.`,
    tools: skills.slice(0, 3).join(', '),
    learnedSkills: learnedSkillsSubset,
    startDate: exp1Start,
    endDate: exp1End < now ? exp1End : null,
    isCurrent: exp1End >= now,
  });

  if (yearsExp >= 5 && Math.random() > 0.35) {
    const exp2Start = new Date(exp1End.getTime() + randomInt(1, 90) * 24 * 60 * 60 * 1000);
    if (exp2Start < now) {
      const isCurrent = Math.random() > 0.4;
      const learnedSkillsSubset2 = randomSubset(skills, 1, Math.min(3, skills.length));
      experiences.push({
        company: randomPick(employers.filter(e => e !== experiences[0].company)),
        position: professionTitle,
        city: randomPick(cities),
        workMode: randomPick(workModes),
        contractType: 'FULL_TIME',
        description: generateExperienceDescription(professionTitle, skills),
        functions: `Desempeño del cargo de ${professionTitle.toLowerCase()} con responsabilidad y compromiso.`,
        achievements: `Logros destacados en el área de ${professionTitle.toLowerCase()}.`,
        tools: skills.slice(0, 3).join(', '),
        learnedSkills: learnedSkillsSubset2,
        startDate: exp2Start,
        endDate: isCurrent ? null : new Date(now.getFullYear() - randomInt(0, 1), randomInt(0, 11), randomInt(1, 28)),
        isCurrent,
      });
    }
  }

  return experiences;
}

function generateEducation(professionTitle: string) {
  const { degree, fieldOfStudy, formationLevel } = getDegree(professionTitle);
  const now = new Date();
  const endDate = randomDate(
    new Date(now.getFullYear() - 10, 0, 1),
    new Date(now.getFullYear() - 1, 0, 1),
  );
  const startDate = new Date(
    endDate.getFullYear() - randomInt(2, 5),
    randomInt(0, 1),
    randomInt(1, 28),
  );

  return {
    institution: randomPick(institutions),
    degree,
    fieldOfStudy,
    educationType: 'FORMAL',
    formationLevel,
    startDate,
    endDate: endDate > now ? null : endDate,
    isCurrent: endDate > now,
  };
}

function generateProjects(professionTitle: string, skills: string[]) {
  const techSkills = skills.filter(s =>
    ['Angular', 'NestJS', 'PostgreSQL', 'APIs REST', 'Git', 'Docker', 'TypeScript', 'Python',
     'HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'Figma', 'Responsive Design',
     'Photoshop', 'Illustrator', 'AutoCAD', 'Revit', 'SketchUp', 'Windows Server'].includes(s),
  );

  const projectNames: Record<string, string[]> = {
    'Ingeniero de sistemas': ['Sistema de Gestión de Inventarios', 'Plataforma E-Commerce', 'API de Microservicios'],
    'Desarrollador web': ['Landing Page Corporativa', 'Sistema de Reservas', 'Dashboard Analítico'],
    'Diseñador gráfico': ['Rediseño de Marca', 'Campaña Publicitaria Digital', 'Sistema de Diseño UI'],
    'Arquitecto': ['Diseño de Vivienda Unifamiliar', 'Remodelación de Oficinas', 'Proyecto de Parque Urbano'],
    'Ingeniero civil': ['Supervisión de Obra Vial', 'Diseño Estructural de Puente', 'Proyecto de Saneamiento'],
    'Técnico en sistemas': ['Mantenimiento de Red Empresarial', 'Migración de Servidores', 'Implementación de Help Desk'],
    'Electricista': ['Instalación Eléctrica Residencial', 'Mantenimiento de Tableros Industriales', 'Proyecto de Iluminación Comercial'],
    'Community manager': ['Campaña de Instagram Ads', 'Estrategia de Contenido para Marca', 'Gestión de Crisis en Redes Sociales'],
    'Fotógrafo': ['Sesión Fotográfica Corporativa', 'Catálogo de Productos', 'Cobertura de Evento Empresarial'],
  };

  const defaultNames = ['Proyecto de ' + professionTitle, 'Iniciativa de Mejora', 'Proyecto Independiente'];
  const names = projectNames[professionTitle] ?? defaultNames;
  const projectName = randomPick(names);

  const now = new Date();
  const startDate = randomDate(
    new Date(now.getFullYear() - 4, 0, 1),
    new Date(now.getFullYear() - 1, 0, 1),
  );
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + randomInt(1, 6), randomInt(1, 28));
  const finalEndDate = endDate > now ? now : endDate;

  return {
    name: projectName,
    description: `Proyecto de ${professionTitle.toLowerCase()} desarrollado con enfoque en calidad y resultados.`,
    role: professionTitle,
    responsibilities: `Ejecución de actividades relacionadas con ${professionTitle.toLowerCase()} en el marco del proyecto.`,
    technologies: techSkills.length > 0 ? randomSubset(techSkills, 2, Math.min(5, techSkills.length)) : randomSubset(skills, 2, 4),
    projectType: 'INDIVIDUAL',
    status: 'COMPLETED',
    startDate,
    endDate: finalEndDate,
  };
}

const companies = [
  {
    email: 'empresa001@demo.com',
    companyName: 'Talento Llanero S.A.S.',
    nit: '900.001.001-1',
    sector: 'Recursos Humanos',
    city: 'Villavicencio',
    phone: '608 681 0001',
    websiteUrl: 'https://www.talentollanero.com.co',
    description: 'Empresa líder en selección de talento profesional en la región de la Orinoquía. Conectamos a los mejores profesionales con las empresas más importantes de los Llanos Orientales y el resto de Colombia.',
  },
  {
    email: 'empresa002@demo.com',
    companyName: 'Conecta Empleo Colombia',
    nit: '900.002.002-2',
    sector: 'Tecnología',
    city: 'Bogotá',
    phone: '601 742 0002',
    websiteUrl: 'https://www.conectaempleo.com.co',
    description: 'Plataforma de conexión laboral entre profesionales y empresas en toda Colombia. Utilizamos tecnología de punta para hacer match entre candidatos y las vacantes ideales.',
  },
  {
    email: 'empresa003@demo.com',
    companyName: 'Recursos Humanos Andinos',
    nit: '900.003.003-3',
    sector: 'Consultoría',
    city: 'Medellín',
    phone: '604 465 0003',
    websiteUrl: 'https://www.rhandinos.com.co',
    description: 'Consultora especializada en gestión de talento humano con presencia nacional. Ofrecemos soluciones integrales de reclutamiento, selección y desarrollo organizacional.',
  },
];

async function seedCompanies() {
  console.log('\n--- Creando empresas ---');
  for (const c of companies) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (existing) {
      console.log(`  ⏭  Empresa ya existe: ${c.companyName}`);
      continue;
    }
    await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: await bcrypt.hash('Empresa.123', 10),
        role: UserRole.COMPANY,
        companyProfile: {
          create: {
            companyName: c.companyName,
            nit: c.nit,
            sector: c.sector,
            city: c.city,
            phone: c.phone,
            websiteUrl: c.websiteUrl,
            description: c.description,
          },
        },
      },
    });
    console.log(`  ✓  Empresa creada: ${c.companyName}`);
  }
}

async function seedCandidates() {
  console.log('\n--- Creando candidatos ---');
  for (let i = 0; i < 100; i++) {
    const num = String(i + 1).padStart(3, '0');
    const email = `candidato${num}@demo.com`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ⏭  Candidato ya existe: ${email}`);
      if ((i + 1) % 10 === 0) console.log(`     Progreso: ${i + 1}/100 candidatos verificados`);
      continue;
    }

    const professionIdx = i % professions.length;
    const profession = professions[professionIdx];
    const firstName = firstNames[i % firstNames.length];
    const lastName1 = lastNames1[i % lastNames1.length];
    const lastName2 = lastNames2[i % lastNames2.length];
    const fullName = `${firstName} ${lastName1} ${lastName2}`;
    const city = cities[i % cities.length];
    const yearsExp = randomInt(1, 18);
    const selectedSkills = randomSubset(profession.skills, 4, Math.min(8, profession.skills.length));
    const skillObjects = selectedSkills.map(skillName => {
      const normalized = normalizeSkillName(skillName);
      const normalizedForDb = normalized.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return {
        name: normalized,
        normalizedName: normalizedForDb,
        level: weightedLevel(),
      };
    });
    const experiences = generateExperiences(profession.title, selectedSkills, yearsExp, city);
    const education = generateEducation(profession.title);
    const projects = generateProjects(profession.title, selectedSkills);
    const summary = generateSummary(profession.title, yearsExp, selectedSkills, city);
    const phone = generatePhone();

    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('Candidato.123', 10),
        role: UserRole.CANDIDATE,
        profile: {
          create: {
            fullName,
            professionalTitle: profession.title,
            summary,
            phone,
            city,
            slug: `candidato${num}`,
            isPublished: true,
            showPhone: true,
            skills: { create: skillObjects },
            experiences: { create: experiences },
            educations: { create: education },
            projects: { create: projects },
          },
        },
      },
    });

    console.log(`  ✓  [${i + 1}/100] ${fullName} — ${profession.title} (${city})`);
    if ((i + 1) % 10 === 0) console.log(`     --- ${i + 1}/100 completados ---`);
  }
}

async function main() {
  console.log('\n🚀 Iniciando seed de base de datos...');

  await seedCompanies();
  await seedCandidates();

  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.profile.count({ where: { isPublished: true } });
  const totalCompanies = await prisma.companyProfile.count();
  const totalSkills = await prisma.skill.count();
  const totalExperiences = await prisma.experience.count();
  const totalEducation = await prisma.education.count();
  const totalProjects = await prisma.project.count();

  console.log('\n--- RESUMEN ---');
  console.log(`  Usuarios totales:      ${totalUsers}`);
  console.log(`  Perfiles publicados:   ${totalProfiles}`);
  console.log(`  Empresas:              ${totalCompanies}`);
  console.log(`  Habilidades:           ${totalSkills}`);
  console.log(`  Experiencias:          ${totalExperiences}`);
  console.log(`  Estudios:              ${totalEducation}`);
  console.log(`  Proyectos:             ${totalProjects}`);
  console.log('\n✅ Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
