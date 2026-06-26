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
}

export interface JobCompany {
  companyName?: string;
  sector?: string;
  city?: string;
  logoUrl?: string;
  description?: string;
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
    status: string;
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

export interface PaginatedJobs {
  data: JobOffer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type JobOfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type JobApplicationStatus = 'PENDING' | 'REVIEWED' | 'PRESELECTED' | 'REJECTED' | 'HIRED';
