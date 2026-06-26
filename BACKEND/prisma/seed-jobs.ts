import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { UserRole, JobOfferStatus } from '../libs/database/src/generated/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

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

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const companies = [
  { email: 'rh.llanero@demo.com', companyName: 'Talento Llanero S.A.S.', sector: 'Recursos Humanos', city: 'Villavicencio', phone: '608 681 0001', websiteUrl: 'https://talentollanero.com.co', description: 'Empresa líder en selección de talento profesional en la Orinoquía.' },
  { email: 'andina.tech@demo.com', companyName: 'Andina Tech Solutions', sector: 'Tecnología', city: 'Bogotá', phone: '601 742 1001', websiteUrl: 'https://andinatech.com.co', description: 'Consultora de tecnología con más de 10 años desarrollando software empresarial.' },
  { email: 'orinoquia.sw@demo.com', companyName: 'Orinoquia Software Lab', sector: 'Tecnología', city: 'Villavicencio', phone: '608 690 2002', websiteUrl: 'https://orinoquiasw.co', description: 'Laboratorio de innovación tecnológica para los Llanos Orientales.' },
  { email: 'datanova@demo.com', companyName: 'DataNova Colombia', sector: 'Tecnología', city: 'Medellín', phone: '604 465 3003', websiteUrl: 'https://datanova.com.co', description: 'Especialistas en inteligencia de negocios, big data y analítica avanzada.' },
  { email: 'cafe.digital@demo.com', companyName: 'Café Digital S.A.S.', sector: 'Marketing', city: 'Armenia', phone: '606 745 4004', websiteUrl: 'https://cafedigital.co', description: 'Agencia de marketing digital con enfoque en resultados medibles.' },
  { email: 'biosalud@demo.com', companyName: 'BioSalud Integral', sector: 'Salud', city: 'Cali', phone: '602 486 5005', websiteUrl: 'https://biosalud.com.co', description: 'Red de clínicas y centros de salud con presencia en el Valle del Cauca.' },
  { email: 'agrosmart@demo.com', companyName: 'AgroSmart Colombia', sector: 'Agroindustria', city: 'Ibagué', phone: '608 274 6006', websiteUrl: 'https://agrosmart.co', description: 'Tecnología aplicada al agro colombiano para mejorar productividad.' },
  { email: 'horizonte.const@demo.com', companyName: 'Constructora Horizonte', sector: 'Construcción', city: 'Bucaramanga', phone: '607 645 7007', websiteUrl: 'https://constructorahorizonte.com', description: 'Constructora con proyectos residenciales y comerciales en Santander.' },
  { email: 'finorte@demo.com', companyName: 'Financiera Norte', sector: 'Finanzas', city: 'Barranquilla', phone: '605 321 8008', websiteUrl: 'https://financieranorte.com.co', description: 'Soluciones financieras para la región Caribe colombiana.' },
  { email: 'logistics.express@demo.com', companyName: 'Logística Express Colombia', sector: 'Logística', city: 'Bogotá', phone: '601 756 9009', websiteUrl: 'https://logisticaexpress.co', description: 'Transporte y logística nacional con cobertura en las principales ciudades.' },
  { email: 'mkt360@demo.com', companyName: 'Marketing 360 Group', sector: 'Marketing', city: 'Medellín', phone: '604 423 1010', websiteUrl: 'https://mkt360.com.co', description: 'Agencia de marketing integral 360: digital, tradicional y BTL.' },
  { email: 'sanrafael.clinica@demo.com', companyName: 'Clínica San Rafael', sector: 'Salud', city: 'Pereira', phone: '606 348 1111', websiteUrl: 'https://clinicasanrafael.com.co', description: 'Clínica de alta complejidad en el Eje Cafetero.' },
  { email: 'educatech@demo.com', companyName: 'EducaTech LATAM', sector: 'Educación', city: 'Bogotá', phone: '601 789 1212', websiteUrl: 'https://educatech.co', description: 'Plataforma de educación virtual con tecnología de punta.' },
  { email: 'cucuta.dh@demo.com', companyName: 'Cúcuta Digital Hub', sector: 'Tecnología', city: 'Cúcuta', phone: '607 572 1313', websiteUrl: 'https://cucutadigitalhub.co', description: 'Centro de desarrollo tecnológico en la frontera colombo-venezolana.' },
  { email: 'villavo.apps@demo.com', companyName: 'Villavo Apps', sector: 'Tecnología', city: 'Villavicencio', phone: '608 690 1414', websiteUrl: 'https://villavoapps.co', description: 'Fábrica de software llanera especializada en apps móviles y web.' },
  { email: 'bogota.cloud@demo.com', companyName: 'Bogotá Cloud Services', sector: 'Tecnología', city: 'Bogotá', phone: '601 456 1515', websiteUrl: 'https://bogotacloud.co', description: 'Servicios cloud, DevOps e infraestructura para empresas.' },
  { email: 'caribe.sw@demo.com', companyName: 'Caribe Software Factory', sector: 'Tecnología', city: 'Cartagena', phone: '605 664 1616', websiteUrl: 'https://caribesw.co', description: 'Fábrica de software con talento 100% costeño.' },
  { email: 'innova.contable@demo.com', companyName: 'Innova Contable', sector: 'Contabilidad', city: 'Medellín', phone: '604 489 1717', websiteUrl: 'https://innovacontable.co', description: 'Firma de contabilidad y auditoría para pymes.' },
  { email: 'redcom@demo.com', companyName: 'RedCom Telecomunicaciones', sector: 'Telecomunicaciones', city: 'Bogotá', phone: '601 345 1818', websiteUrl: 'https://redcom.co', description: 'Operador de telecomunicaciones con fibra óptica nacional.' },
  { email: 'soluciones.juridicas@demo.com', companyName: 'Soluciones Jurídicas Empresariales', sector: 'Legal', city: 'Bogotá', phone: '601 234 1919', websiteUrl: 'https://solucionesjuridicas.co', description: 'Firma de abogados especializada en derecho corporativo.' },
  { email: 'grupo.adm.capital@demo.com', companyName: 'Grupo Administrativo Capital', sector: 'Administración', city: 'Bogotá', phone: '601 567 2020', websiteUrl: 'https://grupoadmcapital.co', description: 'Outsourcing administrativo y gestión empresarial.' },
  { email: 'ingenia.proyectos@demo.com', companyName: 'Ingenia Proyectos S.A.S.', sector: 'Ingeniería', city: 'Bogotá', phone: '601 890 2121', websiteUrl: 'https://ingeniaproyectos.co', description: 'Ingeniería y gestión de proyectos para diversos sectores.' },
  { email: 'llanos.data@demo.com', companyName: 'Llanos Data Center', sector: 'Tecnología', city: 'Villavicencio', phone: '608 681 2222', websiteUrl: 'https://llanosdc.co', description: 'Centro de procesamiento de datos en los Llanos Orientales.' },
  { email: 'global.support@demo.com', companyName: 'Global Support BPO', sector: 'BPO', city: 'Barranquilla', phone: '605 387 2323', websiteUrl: 'https://globalsupport.co', description: 'BPO con operaciones en servicio al cliente y soporte técnico.' },
  { email: 'comercial.andina@demo.com', companyName: 'Comercializadora Andina', sector: 'Comercio', city: 'Medellín', phone: '604 444 2424', websiteUrl: 'https://comercializadoraandina.co', description: 'Importación y distribución de productos de consumo masivo.' },
  { email: 'ecommerce.co@demo.com', companyName: 'E-commerce Colombia', sector: 'E-commerce', city: 'Bogotá', phone: '601 111 2525', websiteUrl: 'https://ecommercecolombia.co', description: 'Marketplace colombiano con más de 5000 vendedores.' },
  { email: 'diseno.vivo@demo.com', companyName: 'Diseño Vivo Studio', sector: 'Diseño', city: 'Medellín', phone: '604 333 2626', websiteUrl: 'https://disenovivo.co', description: 'Estudio creativo de diseño gráfico y UX/UI.' },
  { email: 'automatiza@demo.com', companyName: 'Automatiza Industrial', sector: 'Ingeniería', city: 'Bogotá', phone: '601 222 2727', websiteUrl: 'https://automatizaindustrial.co', description: 'Automatización de procesos industriales para manufactura.' },
  { email: 'legaltech.co@demo.com', companyName: 'LegalTech Colombia', sector: 'Legal', city: 'Cali', phone: '602 555 2828', websiteUrl: 'https://legaltechcolombia.co', description: 'Tecnología aplicada a servicios legales y cumplimiento.' },
  { email: 'rrhh.plus@demo.com', companyName: 'Recursos Humanos Plus', sector: 'Recursos Humanos', city: 'Bogotá', phone: '601 666 2929', websiteUrl: 'https://rrhhplus.co', description: 'Consultoría integral de gestión humana para empresas.' },
  { email: 'seguridad.it@demo.com', companyName: 'Seguridad IT Colombia', sector: 'Tecnología', city: 'Bogotá', phone: '601 888 3030', websiteUrl: 'https://seguridadit.co', description: 'Ciberseguridad y protección de datos empresariales.' },
  { email: 'salud.ocupacional@demo.com', companyName: 'Salud Ocupacional Integral', sector: 'Salud', city: 'Bogotá', phone: '601 999 3131', websiteUrl: 'https://saludocupacional.co', description: 'Especialistas en salud ocupacional y seguridad en el trabajo.' },
  { email: 'findata@demo.com', companyName: 'FinData Analytics', sector: 'Finanzas', city: 'Bogotá', phone: '601 777 3232', websiteUrl: 'https://findata.co', description: 'Análisis de datos financieros y business intelligence.' },
  { email: 'logistrans@demo.com', companyName: 'LogisTrans Nacional', sector: 'Logística', city: 'Cúcuta', phone: '607 581 3333', websiteUrl: 'https://logistrans.co', description: 'Transporte de carga y logística fronteriza.' },
  { email: 'tecnoredes@demo.com', companyName: 'TecnoRedes Colombia', sector: 'Tecnología', city: 'Pasto', phone: '602 723 3434', websiteUrl: 'https://tecnoredes.co', description: 'Infraestructura de redes y telecomunicaciones en el sur.' },
  { email: 'bluepixel@demo.com', companyName: 'BluePixel Agency', sector: 'Marketing', city: 'Cartagena', phone: '605 652 3535', websiteUrl: 'https://bluepixel.co', description: 'Agencia creativa digital con sede en Cartagena.' },
  { email: 'campotech@demo.com', companyName: 'CampoTech Agro', sector: 'Agroindustria', city: 'Montería', phone: '604 781 3636', websiteUrl: 'https://campotechagro.co', description: 'Soluciones tecnológicas para el agro costeño.' },
  { email: 'urbania@demo.com', companyName: 'Urbania Construcciones', sector: 'Construcción', city: 'Santa Marta', phone: '605 421 3737', websiteUrl: 'https://urbaniaconstrucciones.co', description: 'Desarrollos urbanísticos en la costa Caribe.' },
  { email: 'sw.oriente@demo.com', companyName: 'Software del Oriente', sector: 'Tecnología', city: 'Bucaramanga', phone: '607 634 3838', websiteUrl: 'https://softwareoriente.co', description: 'Desarrollo de software a la medida para empresas santandereanas.' },
  { email: 'soluciones.247@demo.com', companyName: 'Soluciones Empresariales 24/7', sector: 'Consultoría', city: 'Bogotá', phone: '601 543 3939', websiteUrl: 'https://soluciones247.co', description: 'Consultoría empresarial con disponibilidad 24/7.' },
  { email: 'ecopetrol.tech@demo.com', companyName: 'EcoPetrol Tech', sector: 'Energía', city: 'Barrancabermeja', phone: '607 612 4040', websiteUrl: 'https://ecopetroltech.co', description: 'Soluciones tecnológicas para el sector energético.' },
  { email: 'manizales.dev@demo.com', companyName: 'Manizales Dev House', sector: 'Tecnología', city: 'Manizales', phone: '606 882 4141', websiteUrl: 'https://manizalesdev.co', description: 'Casa de desarrollo de software con talento caldense.' },
  { email: 'neiva.digital@demo.com', companyName: 'Neiva Digital', sector: 'Marketing', city: 'Neiva', phone: '608 871 4242', websiteUrl: 'https://neivadigital.co', description: 'Agencia digital para empresas del Huila y sur del país.' },
  { email: 'tunja.soft@demo.com', companyName: 'TunjaSoft', sector: 'Tecnología', city: 'Tunja', phone: '608 745 4343', websiteUrl: 'https://tunjasoft.co', description: 'Desarrollo de software en Boyacá.' },
  { email: 'valledupar.tecnologia@demo.com', companyName: 'Valledupar Tecnología', sector: 'Tecnología', city: 'Valledupar', phone: '605 581 4444', websiteUrl: 'https://valledupartecnologia.co', description: 'Impulso tecnológico para el Cesar.' },
  { email: 'constructora.litoral@demo.com', companyName: 'Constructora Litoral', sector: 'Construcción', city: 'Barranquilla', phone: '605 356 4545', websiteUrl: 'https://constructoralitoral.co', description: 'Construcción de proyectos costeros y turísticos.' },
  { email: 'agencia.pacifico@demo.com', companyName: 'Agencia Pacífico', sector: 'Marketing', city: 'Cali', phone: '602 393 4646', websiteUrl: 'https://agenciapacifico.co', description: 'Agencia de publicidad y marketing en el Pacífico colombiano.' },
  { email: 'servicios.salud.col@demo.com', companyName: 'Servicios Salud Colombia', sector: 'Salud', city: 'Bogotá', phone: '601 221 4747', websiteUrl: 'https://serviciossaludcolombia.co', description: 'Red de servicios de salud a nivel nacional.' },
  { email: 'data.driven@demo.com', companyName: 'Data Driven S.A.S.', sector: 'Tecnología', city: 'Medellín', phone: '604 378 4848', websiteUrl: 'https://datadriven.co', description: 'Consultoría en ciencia de datos e inteligencia artificial.' },
  { email: 'log.yopal@demo.com', companyName: 'Logística Yopal', sector: 'Logística', city: 'Villavicencio', phone: '608 635 4949', websiteUrl: 'https://logisticayopal.co', description: 'Transporte y logística para la Orinoquía.' },
];

const passwordHash = '$2b$10$placeholder_will_be_replaced';

const cities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Cúcuta', 'Villavicencio', 'Pereira', 'Manizales', 'Armenia', 'Santa Marta', 'Ibagué', 'Pasto', 'Montería', 'Neiva', 'Popayán', 'Tunja', 'Valledupar', 'Riohacha', 'Remoto'];
const modalities = ['Remoto', 'Presencial', 'Híbrido'];
const contractTypes = ['Tiempo completo', 'Medio tiempo', 'Prestación de servicios', 'Término fijo', 'Término indefinido', 'Prácticas', 'Freelance'];

interface JobTemplate {
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  skillsRequired: string;
}

const jobTemplates: JobTemplate[] = [
  // Tecnología - Desarrollo
  { title: 'Desarrollador Frontend', description: 'Buscamos Desarrollador Frontend para crear interfaces modernas y responsivas. Participarás en el diseño y desarrollo de aplicaciones web utilizando las últimas tecnologías del ecosistema JavaScript.', requirements: 'Experiencia con Angular o React, TypeScript, HTML5, CSS3, consumo de APIs REST. Conocimientos en diseño responsive y control de versiones con Git.', responsibilities: 'Desarrollar componentes reutilizables, implementar diseños desde Figma, optimizar rendimiento de la aplicación, colaborar con el equipo de backend.', skillsRequired: 'Angular, React, TypeScript, HTML, CSS, REST APIs, Git, Responsive Design' },
  { title: 'Desarrollador Backend', description: 'Buscamos Desarrollador Backend para construir y mantener servicios internos. Participarás en el diseño de APIs, integración con bases de datos y mejora continua de módulos existentes.', requirements: 'Experiencia en Node.js, NestJS o Express, PostgreSQL, Prisma ORM, diseño de APIs REST, Docker y Git.', responsibilities: 'Desarrollar endpoints, diseñar esquemas de base de datos, corregir incidencias, documentar cambios, participar en revisiones de código.', skillsRequired: 'Node.js, NestJS, PostgreSQL, Prisma, REST APIs, Docker, Git, TypeScript' },
  { title: 'Desarrollador Full Stack', description: 'Buscamos un desarrollador versátil capaz de trabajar tanto en frontend como backend. Participarás en el ciclo completo de desarrollo de productos digitales.', requirements: 'Mínimo 1 año de experiencia con Angular o React en frontend y Node.js o Python en backend. Conocimientos de bases de datos SQL y NoSQL.', responsibilities: 'Desarrollar funcionalidades end-to-end, revisar código de compañeros, participar en daily standups, contribuir a la arquitectura del sistema.', skillsRequired: 'Angular, Node.js, PostgreSQL, TypeScript, REST APIs, Docker, Git, MongoDB' },
  { title: 'Ingeniero de Software', description: 'Estamos buscando un Ingeniero de Software para diseñar, desarrollar y mantener sistemas escalables. Deberás aplicar buenas prácticas de ingeniería y patrones de diseño.', requirements: 'Título en Ingeniería de Sistemas o afín. Experiencia con Java o C#, arquitectura de microservicios, CI/CD, testing automatizado.', responsibilities: 'Diseñar arquitectura de software, liderar técnicamente proyectos, mentorear desarrolladores junior, asegurar calidad de código.', skillsRequired: 'Java, Spring Boot, PostgreSQL, Docker, Microservicios, CI/CD, Git, Testing' },
  { title: 'Ingeniero de Sistemas', description: 'Ingeniero de Sistemas para gestión de infraestructura tecnológica. Serás responsable de mantener y optimizar los sistemas informáticos de la organización.', requirements: 'Conocimientos en administración de servidores Windows/Linux, redes, virtualización, Active Directory y soporte a usuarios.', responsibilities: 'Administrar servidores, gestionar redes, implementar políticas de seguridad, dar soporte técnico de segundo nivel, documentar configuraciones.', skillsRequired: 'Windows Server, Linux, Redes, Active Directory, Virtualización, VMware, Firewall, Backup' },
  { title: 'QA Tester', description: 'Buscamos QA Tester para asegurar la calidad de nuestros productos. Realizarás pruebas manuales y automatizadas para garantizar entregas sin errores.', requirements: 'Conocimientos en metodologías ágiles, creación de casos de prueba, reporte de bugs, testing automatizado con Selenium o Cypress.', responsibilities: 'Diseñar y ejecutar planes de prueba, reportar y hacer seguimiento a bugs, automatizar pruebas de regresión, colaborar con desarrollo.', skillsRequired: 'Testing, Selenium, Cypress, Jira, Scrum, SQL, Postman, Automatización' },
  { title: 'Analista de Datos', description: 'Buscamos Analista de Datos para transformar datos en información estratégica. Trabajarás con diferentes fuentes de datos para generar reportes y dashboards.', requirements: 'Experiencia con SQL, Excel avanzado, Power BI o Tableau, Python para análisis de datos. Capacidad para comunicar hallazgos.', responsibilities: 'Extraer y limpiar datos, crear dashboards, generar reportes ejecutivos, identificar tendencias, proponer mejoras basadas en datos.', skillsRequired: 'SQL, Excel, Power BI, Python, Análisis de datos, Visualización, Tableau, ETL' },
  { title: 'Data Engineer', description: 'Data Engineer para diseñar e implementar pipelines de datos. Construirás la infraestructura necesaria para que los analistas puedan trabajar con datos confiables.', requirements: 'Experiencia con Python, Apache Spark o Airflow, bases de datos SQL y NoSQL, cloud (AWS o GCP), ETL.', responsibilities: 'Diseñar pipelines de datos, mantener data warehouses, optimizar consultas, asegurar calidad y disponibilidad de datos.', skillsRequired: 'Python, Spark, Airflow, SQL, AWS, GCP, ETL, Data Warehouse' },
  { title: 'DevOps Junior', description: 'Buscamos DevOps Junior para apoyar la automatización de despliegues y gestión de infraestructura cloud. Aprenderás de un equipo senior.', requirements: 'Conocimientos básicos de Linux, Docker, Git, CI/CD. Deseable experiencia con AWS, Azure o GCP.', responsibilities: 'Configurar pipelines CI/CD, gestionar contenedores Docker, monitorear servicios, apoyar en migraciones cloud.', skillsRequired: 'Docker, Git, Linux, CI/CD, AWS, Kubernetes, Terraform, Bash' },
  { title: 'Soporte Técnico', description: 'Buscamos personal de Soporte Técnico para atención de usuarios. Serás el primer punto de contacto para resolver incidencias tecnológicas.', requirements: 'Conocimientos en Windows, redes básicas, Help Desk, atención al usuario. Deseable experiencia con herramientas de ticketing.', responsibilities: 'Atender tickets de soporte, diagnosticar y resolver problemas, escalar incidencias complejas, documentar soluciones.', skillsRequired: 'Help Desk, Windows, Redes, Atención al usuario, Ticketing, Office 365, Hardware, Impresoras' },
  { title: 'Administrador de Bases de Datos', description: 'DBA para gestionar bases de datos PostgreSQL y SQL Server. Garantizarás disponibilidad, rendimiento y seguridad de los datos.', requirements: 'Experiencia con PostgreSQL, SQL Server, tuning de consultas, backups y recuperación, alta disponibilidad.', responsibilities: 'Administrar instancias de bases de datos, optimizar consultas, implementar estrategias de backup, monitorear rendimiento.', skillsRequired: 'PostgreSQL, SQL Server, Tuning, Backup, Alta disponibilidad, Linux, PL/SQL, Monitoreo' },
  { title: 'Desarrollador Python', description: 'Buscamos Desarrollador Python para proyectos de automatización y backend. Trabajarás en soluciones de procesamiento de datos y APIs.', requirements: 'Experiencia con Python, Django o FastAPI, PostgreSQL, diseño de APIs, Git, testing con pytest.', responsibilities: 'Desarrollar APIs REST, automatizar procesos, escribir pruebas unitarias, participar en diseño de soluciones.', skillsRequired: 'Python, Django, FastAPI, PostgreSQL, REST APIs, Git, pytest, Docker' },
  { title: 'Desarrollador Java', description: 'Desarrollador Java para aplicaciones empresariales. Participarás en proyectos de larga duración para clientes corporativos.', requirements: 'Experiencia con Java 11+, Spring Boot, Hibernate, Maven o Gradle, SQL Server u Oracle, metodologías ágiles.', responsibilities: 'Desarrollar módulos de aplicación, integrar con sistemas legacy, realizar code reviews, documentar APIs.', skillsRequired: 'Java, Spring Boot, Hibernate, SQL Server, Maven, Git, JUnit, Scrum' },
  { title: 'Desarrollador Angular', description: 'Buscamos especialista en Angular para proyectos de transformación digital. Trabajarás en aplicaciones empresariales complejas.', requirements: 'Experiencia sólida con Angular 12+, TypeScript, RxJS, NgRx, Angular Material, testing con Jasmine/Karma.', responsibilities: 'Crear componentes reutilizables, implementar state management, optimizar performance, liderar frontend del proyecto.', skillsRequired: 'Angular, TypeScript, RxJS, NgRx, Angular Material, Jasmine, SCSS, Git' },
  { title: 'Desarrollador React', description: 'React Developer para aplicaciones web modernas. Construirás experiencias de usuario fluidas y de alto rendimiento.', requirements: 'Experiencia con React, hooks, Next.js, TypeScript, state management, CSS-in-JS, testing con Jest.', responsibilities: 'Desarrollar interfaces con React, implementar SSR con Next.js, optimizar bundle size, colaborar con diseño UX.', skillsRequired: 'React, Next.js, TypeScript, Redux, CSS, Jest, Storybook, Git' },
  { title: 'Técnico de Redes', description: 'Técnico de Redes para instalación y mantenimiento de infraestructura de telecomunicaciones.', requirements: 'Conocimientos en cableado estructurado, configuración de switches y routers, protocolos TCP/IP, fibra óptica.', responsibilities: 'Instalar y configurar equipos de red, diagnosticar fallas de conectividad, documentar topología, realizar mantenimiento preventivo.', skillsRequired: 'Redes, Cableado estructurado, Switches, Routers, TCP/IP, Fibra óptica, WiFi, Diagnóstico' },

  // Administrativo
  { title: 'Asistente Administrativo', description: 'Buscamos Asistente Administrativo para apoyar la gestión diaria de la oficina. Serás pieza clave en la organización documental y atención.', requirements: 'Conocimientos en manejo de Office, redacción de documentos, atención telefónica, organización de archivos.', responsibilities: 'Gestionar correspondencia, atender llamadas, organizar archivos físicos y digitales, apoyar en procesos administrativos.', skillsRequired: 'Office, Excel, Redacción, Atención al cliente, Archivo, Organización, Teléfono, Agenda' },
  { title: 'Auxiliar Administrativo', description: 'Auxiliar Administrativo para apoyar en tareas operativas de la empresa. Ideal para personas en formación o recién graduados.', requirements: 'Bachiller o técnico en áreas administrativas. Manejo básico de computador, Office, disposición para aprender.', responsibilities: 'Apoyar en digitación, archivo, atención al cliente interno, mensajería interna, fotocopiado y escaneo.', skillsRequired: 'Digitación, Archivo, Office, Atención al cliente, Organización, Redacción' },
  { title: 'Secretaria Ejecutiva', description: 'Secretaria Ejecutiva para dar soporte directo a la gerencia. Manejarás agenda, comunicaciones y documentos confidenciales.', requirements: 'Experiencia como secretaria ejecutiva, excelente redacción, manejo de Office avanzado, inglés intermedio deseable.', responsibilities: 'Gestionar agenda ejecutiva, redactar comunicaciones, organizar reuniones, atender visitas, manejar información confidencial.', skillsRequired: 'Office, Redacción, Agenda, Atención, Organización, Inglés, Comunicación, Confidencialidad' },
  { title: 'Coordinador Administrativo', description: 'Coordinador Administrativo para liderar los procesos administrativos de la organización. Reportarás directamente a gerencia general.', requirements: 'Título profesional en Administración o afines. Experiencia liderando equipos administrativos y gestionando presupuestos.', responsibilities: 'Coordinar equipo administrativo, gestionar compras, supervisar presupuesto, asegurar cumplimiento de políticas, reportar a gerencia.', skillsRequired: 'Administración, Presupuestos, Liderazgo, Excel, Compras, Gestión documental, Nómina, ERP' },
  { title: 'Auxiliar de Archivo', description: 'Auxiliar de Archivo para gestión documental. Organizarás, clasificarás y digitalizarás documentos según normativa.', requirements: 'Conocimiento en gestión documental, normativa archivística, manejo de escáner y sistemas de información documental.', responsibilities: 'Clasificar documentos, digitalizar archivos, aplicar tablas de retención, mantener inventario documental actualizado.', skillsRequired: 'Gestión documental, Archivística, Digitalización, Clasificación, Office, Organización' },
  { title: 'Recepcionista', description: 'Recepcionista para atención de visitantes y llamadas. Serás la primera imagen de la empresa ante clientes y proveedores.', requirements: 'Excelente presentación personal, habilidades de comunicación, manejo de conmutador, Office básico.', responsibilities: 'Recibir y orientar visitantes, atender y transferir llamadas, gestionar correspondencia, mantener recepción organizada.', skillsRequired: 'Atención al cliente, Comunicación, Conmutador, Office, Organización, Amabilidad' },
  { title: 'Analista de Gestión Documental', description: 'Analista para implementar y mantener el sistema de gestión documental de la organización.', requirements: 'Título en Archivística, Bibliotecología o afines. Conocimiento de normas ISO 15489, metadatos y preservación digital.', responsibilities: 'Diseñar políticas documentales, implementar sistema de gestión, capacitar usuarios, auditar cumplimiento normativo.', skillsRequired: 'Gestión documental, ISO 15489, Metadatos, Digitalización, Capacitación, Auditoría, SharePoint' },

  // Contabilidad / Finanzas
  { title: 'Auxiliar Contable', description: 'Auxiliar Contable para apoyar el área de contabilidad. Registrarás operaciones diarias y apoyarás en la preparación de informes.', requirements: 'Técnico o estudiante de contaduría. Conocimientos en registro de operaciones, facturación, Excel.', responsibilities: 'Registrar facturas, conciliar cuentas, apoyar en cierres mensuales, organizar soportes contables.', skillsRequired: 'Contabilidad, Excel, Facturación, Conciliaciones, NIIF, Registro, Organización' },
  { title: 'Contador Junior', description: 'Contador Junior para gestionar la contabilidad de un grupo de clientes. Trabajarás bajo supervisión de un contador senior.', requirements: 'Tarjeta profesional de contador. Experiencia en declaraciones de renta, IVA, retención en la fuente.', responsibilities: 'Preparar declaraciones tributarias, elaborar estados financieros, conciliar cuentas, atender requerimientos de la DIAN.', skillsRequired: 'Contabilidad, Impuestos, Declaración de renta, IVA, Retención, Excel, Estados financieros, DIAN' },
  { title: 'Analista Financiero', description: 'Analista Financiero para evaluar proyectos de inversión y generar reportes de desempeño financiero.', requirements: 'Título en finanzas, economía o afines. Experiencia en modelaje financiero, Excel avanzado, Power BI.', responsibilities: 'Elaborar modelos financieros, evaluar rentabilidad de proyectos, generar dashboards ejecutivos, apoyar planeación financiera.', skillsRequired: 'Finanzas, Excel, Power BI, Modelaje financiero, Análisis, Proyecciones, Valoración, SAP' },
  { title: 'Auxiliar de Nómina', description: 'Auxiliar de Nómina para procesar pagos de empleados y novedades laborales. Garantizarás que todos reciban su pago a tiempo.', requirements: 'Experiencia en liquidación de nómina, seguridad social, parafiscales, manejo de software de nómina.', responsibilities: 'Liquidar nómina mensual, gestionar novedades, calcular prestaciones sociales, atender consultas de empleados.', skillsRequired: 'Nómina, Seguridad social, Parafiscales, Excel, Liquidación, Prestaciones, Software de nómina' },
  { title: 'Analista de Facturación', description: 'Analista para gestionar el ciclo de facturación de la empresa. Asegurarás que los clientes reciban sus facturas correctas.', requirements: 'Experiencia en facturación electrónica, validación de datos, conciliación de cuentas por cobrar, Excel intermedio.', responsibilities: 'Generar facturas electrónicas, validar datos antes de facturar, conciliar pagos recibidos, gestionar cartera.', skillsRequired: 'Facturación electrónica, Excel, Conciliación, Cartera, Atención al cliente, Validación de datos' },
  { title: 'Asistente de Tesorería', description: 'Asistente de Tesorería para gestionar pagos y flujo de caja. Trabajarás con bancos y proveedores diariamente.', requirements: 'Experiencia en tesorería, manejo de portales bancarios, conciliación bancaria, Excel.', responsibilities: 'Programar pagos a proveedores, conciliar extractos bancarios, gestionar caja menor, preparar flujo de caja.', skillsRequired: 'Tesorería, Conciliación bancaria, Excel, Portales bancarios, Pagos, Flujo de caja' },

  // Marketing / Diseño
  { title: 'Community Manager', description: 'Community Manager para gestionar las redes sociales de nuestros clientes. Crearás contenido atractivo y manejarás la relación con la comunidad.', requirements: 'Experiencia manejando redes sociales, creación de contenido, Meta Ads, copywriting, fotografía básica.', responsibilities: 'Planificar calendario editorial, crear contenido, responder mensajes, gestionar pauta digital, analizar métricas.', skillsRequired: 'Redes sociales, Canva, Meta Ads, Copywriting, Fotografía, Analítica, Calendario de contenido, Instagram' },
  { title: 'Diseñador Gráfico', description: 'Diseñador Gráfico para crear piezas visuales para medios digitales e impresos. Darás vida a la identidad visual de las marcas.', requirements: 'Dominio de Photoshop, Illustrator, InDesign. Portafolio de trabajos previos. Conocimientos de diseño editorial y digital.', responsibilities: 'Diseñar piezas para redes sociales, crear material impreso, desarrollar identidad visual, participar en sesiones creativas.', skillsRequired: 'Photoshop, Illustrator, InDesign, Diseño editorial, Branding, Figma, Creatividad, Tipografía' },
  { title: 'Diseñador UX/UI', description: 'Diseñador UX/UI para crear experiencias digitales centradas en el usuario. Participarás desde la investigación hasta el prototipado.', requirements: 'Portafolio de UX/UI, dominio de Figma, conocimiento de principios de usabilidad, experiencia con user testing.', responsibilities: 'Investigar usuarios, crear wireframes y prototipos, diseñar interfaces, realizar tests de usabilidad, iterar diseños.', skillsRequired: 'Figma, UX Design, UI Design, Prototipado, User Testing, Wireframing, Design Systems, Sketch' },
  { title: 'Analista de Marketing Digital', description: 'Analista para medir y optimizar campañas de marketing digital. Tomarás decisiones basadas en datos.', requirements: 'Experiencia con Google Analytics, Google Ads, Meta Ads, Excel, dashboards. Certificaciones deseables.', responsibilities: 'Configurar tracking de campañas, generar reportes de rendimiento, analizar embudos de conversión, recomendar optimizaciones.', skillsRequired: 'Google Analytics, Google Ads, Meta Ads, Excel, Dashboards, SEO, SEM, Analítica' },
  { title: 'Creador de Contenido', description: 'Creador de Contenido para producir artículos, videos y publicaciones. Contarás historias que conecten con la audiencia.', requirements: 'Excelente redacción, conocimientos de SEO, manejo de redes sociales, edición básica de video.', responsibilities: 'Escribir artículos SEO, crear guiones para video, gestionar blog corporativo, planificar contenido mensual.', skillsRequired: 'Redacción, SEO, WordPress, Edición de video, Redes sociales, Creatividad, Storytelling, Investigación' },
  { title: 'Especialista SEO', description: 'Especialista SEO para mejorar el posicionamiento orgánico de sitios web. Trabajarás con equipos de contenido y desarrollo.', requirements: 'Experiencia comprobada en SEO on-page y off-page, link building, Google Search Console, herramientas SEO.', responsibilities: 'Auditar sitios web, investigar palabras clave, optimizar contenido, construir enlaces, monitorear rankings.', skillsRequired: 'SEO, Google Search Console, Ahrefs, SEMrush, Link building, WordPress, HTML, Analítica' },

  // Ventas / Servicio
  { title: 'Asesor Comercial', description: 'Asesor Comercial para venta de productos y servicios. Buscarás activamente nuevos clientes y mantendrás relaciones con los existentes.', requirements: 'Experiencia en ventas, habilidades de negociación, orientación a resultados, manejo de CRM, disponibilidad para viajar.', responsibilities: 'Prospección de clientes, presentación de productos, cierre de ventas, seguimiento posventa, reporte de gestión.', skillsRequired: 'Ventas, Negociación, CRM, Comunicación, Prospección, Cierre de ventas, Excel, Servicio al cliente' },
  { title: 'Ejecutivo de Ventas', description: 'Ejecutivo de Ventas con experiencia en ventas B2B. Manejarás cuentas corporativas y buscarás nuevas oportunidades de negocio.', requirements: 'Experiencia en ventas B2B, manejo de relaciones corporativas, capacidad de negociación con altos ejecutivos.', responsibilities: 'Gestionar cuentas clave, desarrollar nuevos negocios, preparar propuestas comerciales, negociar contratos.', skillsRequired: 'Ventas B2B, Negociación, CRM, Propuestas, Contratos, Relaciones corporativas, Presentaciones, Cierre' },
  { title: 'Representante de Servicio al Cliente', description: 'Representante para atender consultas y reclamos de clientes. Serás la voz de la empresa ante los usuarios.', requirements: 'Excelente comunicación verbal y escrita, paciencia, manejo de objeciones, experiencia en call center.', responsibilities: 'Atender llamadas y chats, resolver consultas, gestionar reclamos, escalar casos complejos, mantener satisfacción del cliente.', skillsRequired: 'Servicio al cliente, Call center, Comunicación, Resolución de problemas, Paciencia, Empatía, CRM, Chat' },
  { title: 'Agente Call Center', description: 'Agente de Call Center para atención de llamadas entrantes y salientes. Trabajarás en un ambiente dinámico y orientado a métricas.', requirements: 'Bachiller, buena dicción, manejo de computador, disponibilidad de horario. Experiencia en call center es un plus.', responsibilities: 'Responder llamadas, seguir guiones, registrar información en el sistema, cumplir metas de atención.', skillsRequired: 'Call center, Comunicación, Ventas telefónicas, Digitación, Manejo de objeciones, Trabajo bajo presión' },
  { title: 'Coordinador de Servicio al Cliente', description: 'Coordinador para liderar el equipo de servicio al cliente. Asegurarás la calidad y oportunidad en la atención.', requirements: 'Experiencia liderando equipos de servicio, manejo de indicadores, mejora de procesos, resolución de conflictos.', responsibilities: 'Supervisar agentes, monitorear calidad, gestionar casos escalados, generar reportes, capacitar al equipo.', skillsRequired: 'Servicio al cliente, Liderazgo, Indicadores, Mejora de procesos, CRM, Capacitación, Resolución de conflictos' },

  // Salud
  { title: 'Auxiliar de Enfermería', description: 'Auxiliar de Enfermería para brindar cuidados básicos a pacientes. Trabajarás bajo supervisión de enfermeros profesionales.', requirements: 'Certificado de auxiliar de enfermería. Conocimientos en signos vitales, curaciones, administración de medicamentos.', responsibilities: 'Tomar signos vitales, realizar curaciones, administrar medicamentos, asistir en procedimientos, mantener registros.', skillsRequired: 'Enfermería, Signos vitales, Curaciones, Medicamentos, Atención al paciente, Registros clínicos, Bioseguridad' },
  { title: 'Psicólogo Organizacional', description: 'Psicólogo Organizacional para gestionar el bienestar y clima laboral. Diseñarás programas de desarrollo para empleados.', requirements: 'Título en psicología, especialización en organizacional. Experiencia en evaluación de clima, selección, talleres.', responsibilities: 'Evaluar clima laboral, diseñar programas de bienestar, realizar evaluaciones, apoyar selección, mediar conflictos.', skillsRequired: 'Psicología organizacional, Clima laboral, Selección, Evaluación, Talleres, Mediación, Bienestar, Comunicación' },
  { title: 'Coordinador de Salud Ocupacional', description: 'Coordinador para diseñar y ejecutar programas de salud ocupacional y seguridad en el trabajo.', requirements: 'Título en salud ocupacional o afines. Conocimiento en SG-SST, normativa colombiana, investigación de accidentes.', responsibilities: 'Implementar SG-SST, investigar accidentes, realizar inspecciones, capacitar en seguridad, gestionar indicadores.', skillsRequired: 'Salud ocupacional, SG-SST, Seguridad industrial, Capacitación, Investigación de accidentes, Normativa, Indicadores' },
  { title: 'Terapeuta Ocupacional', description: 'Terapeuta Ocupacional para rehabilitación física y cognitiva de pacientes. Trabajarás en equipo interdisciplinario.', requirements: 'Título en terapia ocupacional, RETHUS vigente. Experiencia en rehabilitación, valoración, adaptación de entornos.', responsibilities: 'Valorar pacientes, diseñar planes de intervención, realizar terapias, adaptar entornos, educar a familiares.', skillsRequired: 'Terapia ocupacional, Rehabilitación, Valoración, Intervención, Pacientes, Trabajo en equipo, RETHUS' },

  // Logística
  { title: 'Auxiliar Logístico', description: 'Auxiliar Logístico para apoyar la operación del centro de distribución. Trabajarás en picking, packing y despacho.', requirements: 'Bachiller, disponibilidad para trabajo físico, manejo de inventarios básico, documentación de envíos.', responsibilities: 'Recibir y verificar mercancía, preparar pedidos, empacar y rotular, cargar y descargar, mantener orden en bodega.', skillsRequired: 'Logística, Inventarios, Picking, Packing, Bodega, Montacargas, Documentación, Trabajo en equipo' },
  { title: 'Coordinador de Inventarios', description: 'Coordinador para gestionar y controlar los inventarios de la compañía. Asegurarás la exactitud entre sistema y físico.', requirements: 'Experiencia en gestión de inventarios, sistemas ERP, conteos cíclicos, indicadores de gestión, Excel avanzado.', responsibilities: 'Planificar conteos cíclicos, analizar diferencias, gestionar obsolescencia, optimizar niveles de stock, reportar KPIs.', skillsRequired: 'Inventarios, ERP, Conteos cíclicos, Excel, Indicadores, Logística, SAP, Optimización' },
  { title: 'Analista de Compras', description: 'Analista de Compras para gestionar el abastecimiento. Negociarás con proveedores para obtener las mejores condiciones.', requirements: 'Experiencia en compras, negociación con proveedores, análisis de cotizaciones, manejo de ERP.', responsibilities: 'Cotizar y negociar con proveedores, generar órdenes de compra, hacer seguimiento a entregas, evaluar desempeño de proveedores.', skillsRequired: 'Compras, Negociación, Proveedores, ERP, Cotizaciones, Excel, Abastecimiento, Análisis' },
  { title: 'Supervisor de Bodega', description: 'Supervisor para liderar la operación de bodega. Gestionarás personal y asegurarás el cumplimiento de metas de despacho.', requirements: 'Experiencia supervisando bodegas, manejo de personal, conocimiento en WMS, indicadores logísticos.', responsibilities: 'Asignar tareas al equipo, supervisar recepción y despacho, asegurar estándares de seguridad, reportar novedades a gerencia.', skillsRequired: 'Bodega, Liderazgo, WMS, Logística, Indicadores, Seguridad industrial, Inventarios, Personal' },
  { title: 'Conductor Repartidor', description: 'Conductor para reparto de mercancía en la ciudad. Garantizarás entregas puntuales y en buen estado.', requirements: 'Licencia de conducción B1 o C1 vigente, conocimiento de la ciudad, experiencia en reparto, manejo de documentación.', responsibilities: 'Conducir vehículo de reparto, entregar pedidos a clientes, cobrar si aplica, verificar documentos, mantener vehículo en buen estado.', skillsRequired: 'Conducción, Reparto, Servicio al cliente, Rutas, Documentación, Manejo defensivo, Puntualidad, Organización' },

  // Ingeniería
  { title: 'Ingeniero Industrial', description: 'Ingeniero Industrial para optimización de procesos productivos. Implementarás mejoras que reduzcan costos y aumenten eficiencia.', requirements: 'Título en ingeniería industrial, experiencia en mejora continua, lean manufacturing, Six Sigma, manejo de indicadores.', responsibilities: 'Analizar procesos, identificar mejoras, implementar lean, diseñar KPIs, liderar proyectos de optimización.', skillsRequired: 'Mejora continua, Lean Manufacturing, Six Sigma, Indicadores, Procesos, Excel, Project, Análisis' },
  { title: 'Ingeniero Civil', description: 'Ingeniero Civil para supervisión de obras. Asegurarás que los proyectos se ejecuten según especificaciones técnicas y normativa.', requirements: 'Título en ingeniería civil, matrícula profesional, experiencia en supervisión de obras, AutoCAD, gestión de presupuestos.', responsibilities: 'Supervisar ejecución de obra, controlar calidad de materiales, gestionar cronograma, reportar avances, asegurar cumplimiento de normas.', skillsRequired: 'AutoCAD, Supervisión de obra, Presupuestos, Cronogramas, Materiales, Normativa, Gestión, Civil 3D' },
  { title: 'Ingeniero Ambiental', description: 'Ingeniero Ambiental para gestionar el impacto ambiental de las operaciones. Asegurarás el cumplimiento de la normativa ambiental.', requirements: 'Título en ingeniería ambiental, conocimiento de licencias ambientales, sistemas de gestión ISO 14001.', responsibilities: 'Elaborar estudios de impacto ambiental, tramitar licencias, monitorear indicadores, diseñar planes de mitigación.', skillsRequired: 'Gestión ambiental, ISO 14001, Licencias ambientales, Monitoreo, Residuos, Sostenibilidad, Normativa, Auditoría' },
  { title: 'Ingeniero Mecánico', description: 'Ingeniero Mecánico para diseño y mantenimiento de maquinaria industrial. Trabajarás en proyectos de mejora de equipos.', requirements: 'Título en ingeniería mecánica, experiencia en diseño mecánico, mantenimiento industrial, SolidWorks o Inventor.', responsibilities: 'Diseñar piezas y componentes, planificar mantenimiento, diagnosticar fallas, gestionar repuestos, liderar proyectos de mejora.', skillsRequired: 'SolidWorks, AutoCAD, Mantenimiento, Diseño mecánico, Diagnóstico, Soldadura, Neumática, Hidráulica' },
  { title: 'Ingeniero Electrónico', description: 'Ingeniero Electrónico para proyectos de automatización y control. Diseñarás sistemas electrónicos para la industria.', requirements: 'Título en ingeniería electrónica, experiencia con PLC, SCADA, diseño de circuitos, programación de microcontroladores.', responsibilities: 'Programar PLC, diseñar circuitos, implementar sistemas SCADA, diagnosticar fallas electrónicas, documentar proyectos.', skillsRequired: 'PLC, SCADA, Electrónica, Automatización, Microcontroladores, Diseño de circuitos, Programación, Sensores' },
  { title: 'Coordinador de Proyectos', description: 'Coordinador para gestionar proyectos desde la planeación hasta el cierre. Asegurarás alcance, tiempo y presupuesto.', requirements: 'Experiencia en gestión de proyectos, metodologías ágiles y tradicionales, MS Project o similar, liderazgo de equipos.', responsibilities: 'Planificar proyectos, asignar recursos, hacer seguimiento, gestionar riesgos, reportar avances, liderar reuniones de estatus.', skillsRequired: 'Gestión de proyectos, PMP, Scrum, MS Project, Jira, Presupuestos, Liderazgo, Riesgos' },

  // Legal / RRHH
  { title: 'Abogado Junior', description: 'Abogado Junior para apoyar el área legal corporativa. Trabajarás en contratos, consultas y litigios.', requirements: 'Tarjeta profesional de abogado, experiencia en derecho corporativo, contratos, manejo de Office jurídico.', responsibilities: 'Revisar y redactar contratos, atender consultas legales, apoyar en litigios, investigar jurisprudencia.', skillsRequired: 'Derecho corporativo, Contratos, Litigios, Investigación jurídica, Office, Redacción, Normativa, Jurisprudencia' },
  { title: 'Auxiliar Jurídico', description: 'Auxiliar Jurídico para apoyar en trámites y gestión documental del área legal. Ideal para estudiantes de derecho.', requirements: 'Estudiante de derecho de últimos semestres, conocimiento en gestión documental jurídica, radicación de documentos.', responsibilities: 'Radicar documentos en juzgados, organizar expedientes, hacer seguimiento a procesos, apoyar en investigación.', skillsRequired: 'Derecho, Gestión documental, Radicación, Expedientes, Office, Organización, Investigación, Juzgados' },
  { title: 'Analista de Recursos Humanos', description: 'Analista de RRHH para apoyar procesos de selección, contratación y bienestar. Trabajarás en un ambiente dinámico.', requirements: 'Título en psicología, administración o afines. Experiencia en selección por competencias, entrevistas, pruebas psicotécnicas.', responsibilities: 'Publicar vacantes, filtrar hojas de vida, realizar entrevistas, aplicar pruebas, gestionar contratación, apoyar bienestar.', skillsRequired: 'Selección, Entrevistas, Reclutamiento, Psicotécnicas, Contratación, Excel, Comunicación, Linkedin' },
  { title: 'Reclutador IT', description: 'Reclutador especializado en perfiles de tecnología. Buscarás y atraerás el mejor talento tech del mercado.', requirements: 'Experiencia reclutando perfiles IT, conocimiento del ecosistema tech, manejo de LinkedIn Recruiter, ATS.', responsibilities: 'Definir perfiles con hiring managers, buscar candidatos, entrevistar, negociar ofertas, construir pipeline de talento.', skillsRequired: 'Reclutamiento IT, Linkedin Recruiter, ATS, Entrevistas, Negociación, Employer branding, Tech hiring, Sourcing' },
  { title: 'Coordinador de Talento Humano', description: 'Coordinador para liderar los procesos de recursos humanos. Implementarás estrategias de desarrollo organizacional.', requirements: 'Título en psicología, administración o afines. Experiencia en todos los subsistemas de RRHH, liderazgo de equipos.', responsibilities: 'Coordinar selección, gestionar nómina, administrar clima laboral, implementar planes de capacitación, liderar equipo de RRHH.', skillsRequired: 'RRHH, Selección, Nómina, Clima laboral, Capacitación, Liderazgo, Legislación laboral, Comunicación' },
];

function generateJobTitleVariation(template: JobTemplate, company: typeof companies[0]): JobTemplate {
  const suffixes = [
    ` - ${company.city}`, ` - Área ${company.sector}`, ` (${randomPick(['Híbrido', 'Remoto', 'Presencial'])})`,
    ' Semi Senior', ' Senior', '', ' Junior',
  ];
  const suffix = randomPick(suffixes);
  return {
    ...template,
    title: template.title + suffix,
  };
}

async function main() {
  console.log('\n🚀 Iniciando seed de ofertas laborales...');

  const hash = await bcrypt.hash('Password123!', 10);

  let companiesCreated = 0;
  let companiesExisting = 0;

  for (const c of companies) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (existing) {
      companiesExisting++;
      continue;
    }
    await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: hash,
        role: UserRole.COMPANY,
        companyProfile: {
          create: {
            companyName: c.companyName,
            sector: c.sector,
            city: c.city,
            phone: c.phone,
            websiteUrl: c.websiteUrl,
            description: c.description,
          },
        },
      },
    });
    companiesCreated++;
    console.log(`  ✓ Empresa creada: ${c.companyName}`);
  }

  console.log(`\n  Empresas creadas: ${companiesCreated}, ya existentes: ${companiesExisting}, total: ${companiesCreated + companiesExisting}`);

  const allCompanies = await prisma.user.findMany({
    where: { role: UserRole.COMPANY },
    select: { id: true, companyProfile: { select: { companyName: true, city: true, sector: true } } },
  });

  if (allCompanies.length === 0) {
    console.log('❌ No hay empresas en la base de datos. Ejecuta primero el seed principal.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  Total empresas disponibles: ${allCompanies.length}`);

  let created = 0;
  let skipped = 0;
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const targetPerStatus = {
    PUBLISHED: 120,
    DRAFT: 40,
    CLOSED: 25,
    ARCHIVED: 15,
  };

  for (const [status, target] of Object.entries(targetPerStatus)) {
    for (let i = 0; i < target; i++) {
      const company = allCompanies[i % allCompanies.length];
      const templateIdx = (i + Object.keys(targetPerStatus).indexOf(status) * target) % jobTemplates.length;
      const template = jobTemplates[templateIdx];
      const variation = generateJobTitleVariation(template, company as any);
      const city = randomPick([company.companyProfile?.city, ...cities].filter(Boolean) as string[]);
      const modality = randomPick(modalities);
      const contractType = randomPick(contractTypes);
      const salaryMin = randomInt(1200000, 6000000);
      const salaryMax = salaryMin + randomInt(500000, 3000000);

      const title = variation.title;
      const desc = variation.description;
      const reqs = variation.requirements;
      const resp = variation.responsibilities;
      const skills = variation.skillsRequired;

      const existing = await prisma.jobOffer.findFirst({
        where: { companyId: company.id, title, city },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const data: any = {
        companyId: company.id,
        title,
        description: desc,
        requirements: reqs,
        responsibilities: resp,
        city,
        modality,
        contractType,
        salaryMin,
        salaryMax,
        currency: 'COP',
        skillsRequired: skills,
        status: status as JobOfferStatus,
      };

      if (status === JobOfferStatus.PUBLISHED) {
        data.publishedAt = randomDate(daysAgo(90), daysAgo(1));
      }
      if (status === JobOfferStatus.CLOSED) {
        data.publishedAt = randomDate(daysAgo(90), daysAgo(15));
        data.closedAt = randomDate(daysAgo(14), daysAgo(1));
      }

      await prisma.jobOffer.create({ data });
      created++;
    }
  }

  // Verify totals
  const counts = await Promise.all([
    prisma.jobOffer.count({ where: { status: 'PUBLISHED' as any } }),
    prisma.jobOffer.count({ where: { status: 'DRAFT' as any } }),
    prisma.jobOffer.count({ where: { status: 'CLOSED' as any } }),
    prisma.jobOffer.count({ where: { status: 'ARCHIVED' as any } }),
  ]);

  console.log('\n--- RESUMEN DE OFERTAS ---');
  console.log(`  Publicadas: ${counts[0]}`);
  console.log(`  Borrador:   ${counts[1]}`);
  console.log(`  Cerradas:   ${counts[2]}`);
  console.log(`  Archivadas: ${counts[3]}`);
  console.log(`  Total:      ${counts.reduce((a, b) => a + b, 0)}`);
  console.log(`\n  Creadas en esta ejecución: ${created}`);
  console.log(`  Omitidas (duplicados): ${skipped}`);
  console.log('\n✅ Seed de ofertas completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
