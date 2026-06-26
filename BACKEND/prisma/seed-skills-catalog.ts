import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string });
const prisma = new PrismaClient({ adapter });

const skills = [
  'Angular', 'Angular Material', 'Angular CLI', 'React', 'React Native', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js',
  'Redux', 'Zustand', 'NgRx', 'RxJS', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'Material UI', 'PrimeNG',
  'HTML5', 'CSS3', 'Sass', 'LESS', 'Styled Components', 'Responsive Design', 'Web Components', 'PWA', 'SPA', 'SSR',
  'Webpack', 'Vite', 'ESBuild', 'Babel',
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift',
  'Dart', 'Scala', 'R', 'MATLAB', 'SQL', 'PL/SQL', 'Bash', 'PowerShell', 'Perl', 'Lua', 'Elixir', 'Haskell',
  'F#', 'Groovy', 'Objective-C', 'Assembly', 'COBOL', 'Julia', 'Solidity', 'VBA',
  'NestJS', 'Express.js', 'Node.js', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Laravel', 'ASP.NET Core',
  'Ruby on Rails', 'GraphQL', 'REST API', 'WebSockets', 'Microservicios', 'API Gateway', 'gRPC', 'SOAP',
  'Socket.IO', 'Kafka', 'RabbitMQ', 'Redis Pub/Sub', 'Bull Queue', 'Celery', 'Cron Jobs',
  'Serverless', 'Lambda Functions', 'Middleware', 'CORS', 'Rate Limiting', 'Load Balancing', 'Caching',
  'PostgreSQL', 'MySQL', 'SQL Server', 'Oracle DB', 'MongoDB', 'Redis', 'Firebase', 'Supabase', 'SQLite',
  'MariaDB', 'Cassandra', 'Elasticsearch', 'DynamoDB', 'Neo4j', 'Prisma', 'TypeORM', 'Sequelize', 'Hibernate',
  'Database Design', 'Normalization', 'ERD', 'Stored Procedures', 'Triggers', 'Views', 'Indexes',
  'Query Optimization', 'Backups', 'Replication', 'Sharding', 'ETL', 'Data Warehousing', 'Data Modeling', 'Migrations',
  'Docker', 'Kubernetes', 'Docker Compose', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI',
  'Terraform', 'Ansible', 'Puppet', 'Chef', 'Vagrant', 'Nginx', 'Apache', 'HAProxy',
  'Linux', 'Ubuntu', 'CentOS', 'Debian', 'Red Hat', 'Shell Scripting', 'CI/CD', 'Monitoring',
  'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'ELK Stack', 'Logstash', 'Kibana', 'Sentry', 'PM2',
  'AWS', 'Amazon S3', 'Amazon EC2', 'Amazon RDS', 'AWS Lambda', 'AWS CloudFront', 'AWS Route 53',
  'AWS IAM', 'AWS SQS', 'AWS SNS', 'Azure', 'Azure DevOps', 'Azure Functions', 'Google Cloud',
  'Google Cloud Functions', 'Google Cloud Run', 'Heroku', 'Netlify', 'Vercel', 'DigitalOcean',
  'Cloudflare', 'CDN', 'Auto Scaling', 'Infrastructure as Code', 'Cloud Architecture', 'Cloud Security',
  'Pandas', 'NumPy', 'Power BI', 'Tableau', 'Excel', 'Machine Learning', 'Deep Learning',
  'Data Analysis', 'Data Engineering', 'Data Science', 'Big Data', 'Apache Spark',
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras', 'NLP', 'Computer Vision', 'OpenCV',
  'MLOps', 'Statistics', 'Regression', 'Classification', 'Clustering', 'Time Series', 'Data Visualization',
  'Jest', 'Cypress', 'Playwright', 'Selenium', 'Mocha', 'Chai', 'Jasmine', 'Karma',
  'Pytest', 'JUnit', 'Postman', 'Insomnia', 'Swagger', 'Unit Testing', 'Integration Testing',
  'E2E Testing', 'QA Manual', 'QA Automation', 'Test Cases', 'Bug Tracking', 'Regression Testing',
  'Performance Testing', 'JMeter', 'Load Testing', 'TDD', 'BDD', 'Cucumber', 'Code Coverage', 'SonarQube',
  'JWT', 'OAuth2', 'OpenID Connect', 'SAML', 'OWASP', 'Cybersecurity', 'Ethical Hacking',
  'Penetration Testing', 'Network Security', 'Firewalls', 'VPN', 'SSL/TLS', 'HTTPS', 'Encryption',
  'Hashing', 'bcrypt', 'Secure Coding', 'Authentication', 'Authorization', 'RBAC',
  '2FA', 'CSRF Protection', 'XSS Prevention', 'SQL Injection Prevention', 'ISO 27001',
  'Flutter', 'Android', 'iOS', 'Kotlin Android', 'Swift iOS', 'Ionic', 'Xamarin',
  'Mobile UI', 'Push Notifications', 'Geolocation', 'Mobile Testing', 'Appium',
  'Figma', 'Adobe XD', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator', 'UX Research', 'UI Design',
  'Wireframes', 'Prototyping', 'Design Systems', 'Usability Testing', 'Accessibility', 'WCAG',
  'User Research', 'Design Thinking', 'Color Theory', 'Typography',
  'Scrum', 'Kanban', 'Agile', 'Scrum Master', 'Product Owner', 'Jira', 'Trello', 'Asana',
  'Product Management', 'Project Management', 'User Stories', 'Requirements Analysis', 'UML', 'BPMN',
  'Sprint Planning', 'Retrospectives', 'Backlog Grooming', 'Roadmapping', 'OKRs', 'KPIs',
  'Documentation', 'Technical Writing', 'Change Management',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'VS Code', 'IntelliJ IDEA', 'WebStorm', 'PyCharm',
  'Eclipse', 'Sublime Text', 'Vim', 'Notion', 'Slack', 'Microsoft Teams', 'Discord', 'Zoom',
  'Google Meet', 'Confluence', 'Markdown', 'LaTeX', 'cURL', 'ngrok', 'Terminal',
  'Algoritmos', 'Estructuras de datos', 'Patrones de diseño', 'Arquitectura de software',
  'SOLID', 'Clean Code', 'Clean Architecture', 'DDD', 'Event-Driven Architecture', 'CQRS',
  'Hexagonal Architecture', 'MVC', 'MVVM', 'OOP', 'Functional Programming', 'Reactive Programming',
  'Dependency Injection', 'Refactoring', 'Code Review', 'Pair Programming', 'System Design',
  'API Design', 'Performance Optimization', 'Scalability', 'Concurrency', 'Debugging', 'Logging',
  'Redes', 'TCP/IP', 'DNS', 'DHCP', 'HTTP/HTTPS', 'SSH', 'LAN', 'WAN', 'VLAN',
  'Active Directory', 'Windows Server', 'Group Policy', 'IIS', 'SysAdmin', 'Help Desk',
  'IT Support', 'Ticketing', 'Service Desk', 'ITIL',
  'Arduino', 'Raspberry Pi', 'ESP32', 'Microcontroladores', 'Sensores', 'IoT', 'MQTT',
  'PLC', 'SCADA', 'Embedded Systems', 'Electrónica', 'Robótica', 'Impresión 3D',
  'Blockchain', 'Web3', 'Smart Contracts', 'Unity', 'Game Development', 'RPA',
  'ChatGPT', 'LLM', 'Prompt Engineering', 'Generative AI', 'LangChain', 'OpenAI API',
  'Comunicación efectiva', 'Trabajo en equipo', 'Liderazgo', 'Pensamiento crítico',
  'Resolución de problemas', 'Adaptabilidad', 'Creatividad', 'Gestión del tiempo',
  'Aprendizaje continuo', 'Empatía', 'Inteligencia emocional', 'Negociación', 'Toma de decisiones',
  'Atención al detalle', 'Proactividad', 'Organización', 'Responsabilidad', 'Puntualidad',
  'Ética profesional', 'Trabajo bajo presión', 'Servicio al cliente', 'Orientación a resultados',
  'Inglés', 'Español', 'Portugués', 'Francés', 'Alemán',
  'Finanzas', 'Contabilidad', 'Marketing Digital', 'Ventas', 'CRM', 'Salesforce', 'SAP', 'ERP',
  'Business Intelligence', 'Business Analysis', 'Six Sigma', 'Lean Manufacturing', 'Logística',
  'Recursos Humanos', 'Capacitación', 'E-commerce', 'WordPress', 'Shopify', 'SEO', 'SEM',
  'Google Analytics', 'Google Ads', 'Email Marketing', 'Copywriting', 'Social Media', 'Branding', 'SaaS',
  'Office 365', 'Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Canva',
];

async function main() {
  console.log(`\n📚 Poblando catálogo de ${skills.length} habilidades...\n`);

  // Use the first candidate's profile to store skills
  const profile = await prisma.profile.findFirst({ orderBy: { id: 'asc' } });
  if (!profile) { console.log('  ⚠  No hay perfiles'); return; }

  let inserted = 0;
  let skipped = 0;

  for (const name of skills) {
    const normalized = name.trim().toLowerCase();
    const exists = await prisma.skill.findUnique({
      where: { profileId_normalizedName: { profileId: profile.id, normalizedName: normalized } },
    });
    if (!exists) {
      await prisma.skill.create({
        data: { profileId: profile.id, name, normalizedName: normalized, level: 'BASIC' },
      });
      inserted++;
    } else {
      skipped++;
    }
  }

  const total = await prisma.skill.count();
  console.log(`  ✓  Insertadas: ${inserted}`);
  console.log(`  ⏭  Ya existían: ${skipped}`);
  console.log(`  📊  Total en BD: ${total}\n`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
