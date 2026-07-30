import 'dotenv/config';
import { PrismaClient, ParameterType } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * Seed idempotente (upsert) de los parámetros de sistema migrados a
 * `SystemParameter` — se agrega una fila acá por cada parámetro que se va
 * migrando de una constante de código a la tabla, fase por fase (ver
 * docs/plan-panel-administrativo.md). No pisa el `value` si la fila ya
 * existe (para no resetear un valor que un admin ya haya cambiado a mano).
 */
async function main() {
  const parameters = [
    {
      key: 'JOB_MATCH_ALERT_THRESHOLD',
      category: 'matching',
      type: ParameterType.NUMBER,
      defaultValue: '50',
      minValue: 0,
      maxValue: 100,
      description: 'Porcentaje mínimo de coincidencia con los requisitos de una oferta para notificarle a un candidato que hay un posible match ("Vacante que podría interesarte"). Por debajo de este valor, no se le avisa — sería ruido.',
      riskLevel: 2,
    },
    {
      key: 'DEFAULT_PAGE_SIZE',
      category: 'pagination',
      type: ParameterType.NUMBER,
      defaultValue: '20',
      minValue: 1,
      maxValue: 100,
      description: 'Cantidad de resultados por página cuando el cliente no especifica un límite — unifica lo que antes eran valores distintos (10/20) según el endpoint.',
      riskLevel: 1,
    },
    {
      key: 'MAX_PAGE_SIZE',
      category: 'pagination',
      type: ParameterType.NUMBER,
      defaultValue: '100',
      minValue: 1,
      maxValue: 500,
      description: 'Tope máximo de resultados por página, sin importar lo que pida el cliente — protege contra un `?limit=999999` que sobrecargue la base.',
      riskLevel: 2,
    },
    {
      key: 'CV_RUBRIC_WEIGHTS',
      category: 'ai',
      type: ParameterType.JSON,
      defaultValue: JSON.stringify({ contact: 15, experience: 30, skills: 25, education: 15, projects: 15 }),
      description: 'Pesos de la rúbrica de análisis de CV (deben sumar 100): contact = contacto/estructura, experience = experiencia laboral, skills = habilidades técnicas, education = formación académica, projects = proyectos/portafolio.',
      riskLevel: 3,
    },
    {
      key: 'DEEPSEEK_MODEL',
      category: 'ai',
      type: ParameterType.STRING,
      defaultValue: process.env['DEEPSEEK_MODEL'] || 'deepseek-chat',
      description: 'Modelo de DeepSeek usado por el asistente Joaquín y el análisis de CV. Cambiarlo acá tiene efecto inmediato, sin redeploy — verificar que el nombre del modelo exista en la cuenta de DeepSeek antes de guardarlo.',
      riskLevel: 3,
    },
    {
      key: 'FEATURE_ASSISTANT_ENABLED',
      category: 'feature-flags',
      type: ParameterType.BOOLEAN,
      defaultValue: 'true',
      description: 'Si está en "false", el asistente Joaquín deja de mostrarse en toda la app (candidato y empresa) de inmediato, sin redeploy — útil para desactivarlo temporalmente si DeepSeek tiene una caída.',
      riskLevel: 2,
    },
  ];

  for (const p of parameters) {
    await prisma.systemParameter.upsert({
      where: { key: p.key },
      update: {
        category: p.category,
        type: p.type,
        defaultValue: p.defaultValue,
        minValue: p.minValue,
        maxValue: p.maxValue,
        description: p.description,
        riskLevel: p.riskLevel,
      },
      create: { ...p, value: p.defaultValue },
    });
  }

  console.log(`\nParámetros de sistema sincronizados: ${parameters.length}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
