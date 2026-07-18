import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { titleCaseText, trimText } from '../libs/common/src/normalize/text.util';
import { normalizeEmail } from '../libs/common/src/normalize/email.util';
import { normalizePhoneStorage } from '../libs/common/src/normalize/phone.util';
import { normalizeNitStorage } from '../libs/common/src/normalize/nit.util';
import { normalizeUrl } from '../libs/common/src/normalize/url.util';
import { normalizeSkillDisplay, normalizeSkillKey } from '../libs/common/src/normalize/skill-tag.util';

/**
 * Backfill de normalización para datos que ya existían antes de que estas reglas
 * se aplicaran en los servicios (perfil, empresa, experiencias, educación,
 * habilidades, ofertas laborales). Idempotente: solo escribe una fila si el
 * valor normalizado es distinto del actual, y puede correrse las veces que
 * haga falta sin duplicar trabajo ni pisar datos ya limpios.
 *
 * Modo DRY-RUN por defecto — solo reporta cuántas filas cambiarían, sin tocar
 * la base. Se necesita el flag --apply explícito para escribir de verdad.
 * Casos con riesgo de colisión (dos emails que normalizan al mismo valor, dos
 * habilidades del mismo perfil que normalizan al mismo nombre) NUNCA se
 * resuelven solos acá — se listan aparte para que una persona decida qué
 * hacer, nunca se fusiona ni se borra nada automáticamente.
 */

const APPLY = process.argv.includes('--apply');

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

interface TableReport {
  table: string;
  changed: number;
  unchanged: number;
  skippedCollisions: string[];
}

function printReport(reports: TableReport[]) {
  console.log('\n📊  Resumen del backfill de normalización\n');
  for (const r of reports) {
    console.log(`  ${r.table.padEnd(14)} → cambiarían: ${String(r.changed).padStart(4)}  |  ya normalizados: ${String(r.unchanged).padStart(4)}`);
    if (r.skippedCollisions.length) {
      console.log(`    ⚠️  Colisiones sin resolver (requieren decisión manual):`);
      for (const c of r.skippedCollisions) console.log(`       - ${c}`);
    }
  }
  console.log(`\n  Modo: ${APPLY ? 'APLICADO (se escribió en la base)' : 'DRY-RUN (nada se escribió — correr con --apply para aplicar)'}\n`);
}

async function normalizeUsers(): Promise<TableReport> {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const report: TableReport = { table: 'users.email', changed: 0, unchanged: 0, skippedCollisions: [] };

  const targetByEmail = new Map<string, number[]>();
  for (const u of users) {
    const target = normalizeEmail(u.email);
    if (!targetByEmail.has(target)) targetByEmail.set(target, []);
    targetByEmail.get(target)!.push(u.id);
  }

  for (const u of users) {
    const target = normalizeEmail(u.email);
    if (target === u.email) {
      report.unchanged++;
      continue;
    }

    const collidesWithExisting = users.some((other) => other.id !== u.id && other.email === target);
    const collidesAfterNormalizing = targetByEmail.get(target)!.length > 1;

    if (collidesWithExisting || collidesAfterNormalizing) {
      report.skippedCollisions.push(`user #${u.id} "${u.email}" -> "${target}" (colisiona con otra cuenta)`);
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.user.update({ where: { id: u.id }, data: { email: target } });
    }
  }

  return report;
}

async function normalizeProfiles(): Promise<TableReport> {
  const profiles = await prisma.profile.findMany();
  const report: TableReport = { table: 'profiles', changed: 0, unchanged: 0, skippedCollisions: [] };

  for (const p of profiles) {
    const data: Record<string, string | null> = {};

    if (p.fullName) {
      const v = titleCaseText(p.fullName);
      if (v !== p.fullName) data.fullName = v;
    }
    if (p.professionalTitle) {
      const v = titleCaseText(p.professionalTitle);
      if (v !== p.professionalTitle) data.professionalTitle = v;
    }
    if (p.city) {
      const v = titleCaseText(p.city);
      if (v !== p.city) data.city = v;
    }
    if (p.summary) {
      const v = trimText(p.summary);
      if (v !== p.summary) data.summary = v;
    }
    if (p.phone) {
      const v = normalizePhoneStorage(p.phone);
      if (v !== p.phone) data.phone = v;
    }
    if (p.linkedinUrl) {
      const v = normalizeUrl(p.linkedinUrl);
      if (v !== p.linkedinUrl) data.linkedinUrl = v;
    }
    if (p.githubUrl) {
      const v = normalizeUrl(p.githubUrl);
      if (v !== p.githubUrl) data.githubUrl = v;
    }
    if (p.websiteUrl) {
      const v = normalizeUrl(p.websiteUrl);
      if (v !== p.websiteUrl) data.websiteUrl = v;
    }

    if (Object.keys(data).length === 0) {
      report.unchanged++;
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.profile.update({ where: { id: p.id }, data });
    }
  }

  return report;
}

async function normalizeCompanyProfiles(): Promise<TableReport> {
  const companies = await prisma.companyProfile.findMany();
  const report: TableReport = { table: 'company_profiles', changed: 0, unchanged: 0, skippedCollisions: [] };

  for (const c of companies) {
    const data: Record<string, string | null> = {};

    const nameV = titleCaseText(c.companyName);
    if (nameV !== c.companyName) data.companyName = nameV;

    if (c.sector) {
      const v = titleCaseText(c.sector);
      if (v !== c.sector) data.sector = v;
    }
    if (c.city) {
      const v = titleCaseText(c.city);
      if (v !== c.city) data.city = v;
    }
    if (c.description) {
      const v = trimText(c.description);
      if (v !== c.description) data.description = v;
    }
    if (c.phone) {
      const v = normalizePhoneStorage(c.phone);
      if (v !== c.phone) data.phone = v;
    }
    if (c.nit) {
      const v = normalizeNitStorage(c.nit);
      if (v !== c.nit) data.nit = v;
    }
    if (c.websiteUrl) {
      const v = normalizeUrl(c.websiteUrl);
      if (v !== c.websiteUrl) data.websiteUrl = v;
    }

    if (Object.keys(data).length === 0) {
      report.unchanged++;
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.companyProfile.update({ where: { id: c.id }, data });
    }
  }

  return report;
}

async function normalizeExperiences(): Promise<TableReport> {
  const experiences = await prisma.experience.findMany();
  const report: TableReport = { table: 'experiences', changed: 0, unchanged: 0, skippedCollisions: [] };

  for (const e of experiences) {
    const data: Record<string, unknown> = {};

    const companyV = titleCaseText(e.company);
    if (companyV !== e.company) data.company = companyV;

    const positionV = titleCaseText(e.position);
    if (positionV !== e.position) data.position = positionV;

    if (e.city) {
      const v = titleCaseText(e.city);
      if (v !== e.city) data.city = v;
    }
    if (e.description) {
      const v = trimText(e.description);
      if (v !== e.description) data.description = v;
    }
    if (e.functions) {
      const v = trimText(e.functions);
      if (v !== e.functions) data.functions = v;
    }
    if (e.achievements) {
      const v = trimText(e.achievements);
      if (v !== e.achievements) data.achievements = v;
    }
    if (e.tools) {
      const v = trimText(e.tools);
      if (v !== e.tools) data.tools = v;
    }
    if (e.learnedSkills?.length) {
      const seen = new Map<string, string>();
      for (const raw of e.learnedSkills) {
        const display = normalizeSkillDisplay(raw);
        if (!display) continue;
        const key = normalizeSkillKey(display);
        if (!seen.has(key)) seen.set(key, display);
      }
      const deduped = Array.from(seen.values());
      const changed = deduped.length !== e.learnedSkills.length || deduped.some((v, i) => v !== e.learnedSkills[i]);
      if (changed) data.learnedSkills = deduped;
    }

    if (Object.keys(data).length === 0) {
      report.unchanged++;
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.experience.update({ where: { id: e.id }, data });
    }
  }

  return report;
}

async function normalizeEducations(): Promise<TableReport> {
  const educations = await prisma.education.findMany();
  const report: TableReport = { table: 'educations', changed: 0, unchanged: 0, skippedCollisions: [] };

  for (const e of educations) {
    const data: Record<string, string | null> = {};

    const institutionV = titleCaseText(e.institution);
    if (institutionV !== e.institution) data.institution = institutionV;

    const degreeV = titleCaseText(e.degree);
    if (degreeV !== e.degree) data.degree = degreeV;

    if (e.fieldOfStudy) {
      const v = titleCaseText(e.fieldOfStudy);
      if (v !== e.fieldOfStudy) data.fieldOfStudy = v;
    }
    if (e.description) {
      const v = trimText(e.description);
      if (v !== e.description) data.description = v;
    }

    if (Object.keys(data).length === 0) {
      report.unchanged++;
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.education.update({ where: { id: e.id }, data });
    }
  }

  return report;
}

async function normalizeSkills(): Promise<TableReport> {
  const skills = await prisma.skill.findMany();
  const report: TableReport = { table: 'skills', changed: 0, unchanged: 0, skippedCollisions: [] };

  const targetKeyByProfile = new Map<string, number[]>();
  for (const s of skills) {
    const key = `${s.profileId}:${normalizeSkillKey(s.name)}`;
    if (!targetKeyByProfile.has(key)) targetKeyByProfile.set(key, []);
    targetKeyByProfile.get(key)!.push(s.id);
  }

  for (const s of skills) {
    const displayV = normalizeSkillDisplay(s.name);
    const keyV = normalizeSkillKey(s.name);
    const nameChanged = displayV !== s.name;
    const keyChanged = keyV !== s.normalizedName;

    if (!nameChanged && !keyChanged) {
      report.unchanged++;
      continue;
    }

    const groupKey = `${s.profileId}:${keyV}`;
    const wouldCollide =
      targetKeyByProfile.get(groupKey)!.length > 1 ||
      (await prisma.skill.findFirst({
        where: { profileId: s.profileId, normalizedName: keyV, id: { not: s.id } },
      }));

    if (wouldCollide) {
      report.skippedCollisions.push(`skill #${s.id} "${s.name}" (perfil ${s.profileId}) -> normaliza igual que otra habilidad ya existente`);
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.skill.update({ where: { id: s.id }, data: { name: displayV, normalizedName: keyV } });
    }
  }

  return report;
}

async function normalizeJobOffers(): Promise<TableReport> {
  const jobs = await prisma.jobOffer.findMany();
  const report: TableReport = { table: 'job_offers', changed: 0, unchanged: 0, skippedCollisions: [] };

  for (const j of jobs) {
    const data: Record<string, string | null> = {};

    const titleV = titleCaseText(j.title);
    if (titleV !== j.title) data.title = titleV;

    const descV = trimText(j.description);
    if (descV !== j.description) data.description = descV;

    if (j.requirements) {
      const v = trimText(j.requirements);
      if (v !== j.requirements) data.requirements = v;
    }
    if (j.responsibilities) {
      const v = trimText(j.responsibilities);
      if (v !== j.responsibilities) data.responsibilities = v;
    }
    if (j.city) {
      const v = titleCaseText(j.city);
      if (v !== j.city) data.city = v;
    }

    if (Object.keys(data).length === 0) {
      report.unchanged++;
      continue;
    }

    report.changed++;
    if (APPLY) {
      await prisma.jobOffer.update({ where: { id: j.id }, data });
    }
  }

  return report;
}

async function main() {
  console.log(`\n🧹  Backfill de normalización de datos existentes ${APPLY ? '(APLICANDO CAMBIOS)' : '(dry-run, sin escribir nada)'}...\n`);

  const reports = [
    await normalizeUsers(),
    await normalizeProfiles(),
    await normalizeCompanyProfiles(),
    await normalizeExperiences(),
    await normalizeEducations(),
    await normalizeSkills(),
    await normalizeJobOffers(),
  ];

  printReport(reports);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
