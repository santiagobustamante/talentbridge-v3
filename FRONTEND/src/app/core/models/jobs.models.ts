/**
 * Modelos de dominio del módulo de ofertas laborales (jobs.service.ts):
 * ofertas publicadas por empresas, postulaciones de candidatos y el
 * resultado de comparar las skills requeridas por la oferta contra las del
 * candidato (SkillMatchResult), usado para mostrar el % de match y decidir
 * si puede postularse.
 */
export interface JobOffer {
  id: number;
  companyId: number;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  city?: string;
  modality?: string;
  contractType?: string;
  customContractType?: string;
  workload?: string;
  customWorkload?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  skillsRequired?: string;
  status: JobOfferStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
  company?: JobCompany;
  _count?: { applications?: number };
  hasApplied?: boolean;
  applicationStatus?: string;
  applicationId?: number;
  requiredSkillsList?: string[];
  matchedSkills?: string[];
  canApplyBySkills?: boolean;
  skillMatch?: SkillMatchResult;
  appliedAt?: string;
}

export interface SkillMatchEntry {
  name: string;
  requiredLevel: string | null;
  candidateLevel: string | null;
  status: 'met' | 'insufficient' | 'missing';
}

export interface SkillMatchResult {
  breakdown: SkillMatchEntry[];
  matchedCount: number;
  totalCount: number;
  matchPercent: number;
  hasAnyMatch: boolean;
}

export interface JobCompany {
  companyName?: string;
  sector?: string;
  city?: string;
  logoUrl?: string;
  description?: string;
  companyProfile?: {
    companyName?: string;
    logoUrl?: string;
    city?: string;
    description?: string;
  };
}

export interface JobApplication {
  id: number;
  jobOfferId?: number;
  candidateId?: number;
  coverMessage?: string;
  status: JobApplicationStatus;
  createdAt: string;
  updatedAt: string;
  jobOffer: {
    id: number;
    title: string;
    city?: string;
    modality?: string;
    contractType?: string;
    customContractType?: string;
    workload?: string;
    customWorkload?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    status: string;
    skillsRequired?: string;
    publishedAt?: string;
    createdAt?: string;
    company?: JobCompany;
  };
  candidate?: {
    id: number;
    email?: string;
    profile?: {
      fullName?: string;
      professionalTitle?: string;
      city?: string;
      slug?: string;
      skills?: { name: string; level: string }[];
    };
  };
}

export interface PaginatedApplications {
  data: JobApplication[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedJobs {
  data: JobOffer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type JobOfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type JobApplicationStatus = 'PENDING' | 'REVIEWED' | 'PRESELECTED' | 'REJECTED' | 'HIRED';
