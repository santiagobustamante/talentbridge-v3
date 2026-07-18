/**
 * Modelos de dominio compartidos por candidato/empresa: usuario, perfil
 * público (portafolio), y las entidades que lo componen (skills,
 * experiencia, educación, proyectos). Reflejan la forma en que el backend
 * (portfolio-service / candidate-service, vía el API Gateway) serializa
 * estas entidades; se usan como tipo de retorno de los servicios HTTP del
 * frontend (profile.service.ts, skills.service.ts, etc.) y directamente en
 * los componentes de features/.
 */
export interface User {
  id: number;
  email: string;
  role?: 'CANDIDATE' | 'COMPANY';
  createdAt: string;
  updatedAt: string;
  profile?: Profile;
  companyProfile?: CompanyProfile;
}

export interface CompanyProfile {
  id: number;
  userId: number;
  companyName: string;
  nit?: string;
  sector?: string;
  city?: string;
  phone?: string;
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
}

export interface CandidateSearchResult {
  id: number;
  userId: number;
  fullName: string;
  professionalTitle: string;
  city: string;
  summary: string;
  slug: string;
  isPublished: boolean;
  skills: { id: number; name: string; level: string; endorsementCount?: number; endorsedByMe?: boolean }[];
  _count?: { experiences: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Perfil público de un candidato: es el contenido que se muestra en /portfolio/:slug y en las pantallas de edición del shell candidato. Los flags `show*` controlan qué secciones son visibles en el portafolio público sin borrar los datos. */
export interface Profile {
  id: number;
  userId: number;
  fullName?: string;
  professionalTitle?: string;
  summary?: string;
  phone?: string;
  city?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  slug: string;
  isPublished: boolean;
  showPhone?: boolean;
  showCity?: boolean;
  showLinkedin?: boolean;
  showGithub?: boolean;
  showWebsite?: boolean;
  showExperience?: boolean;
  showEducation?: boolean;
  showProjects?: boolean;
  showSkills?: boolean;
  _count?: { views?: number };
  skills?: Skill[];
  experiences?: Experience[];
  educations?: Education[];
  projects?: Project[];
}

export interface Skill {
  id: number;
  name: string;
  level: string;
  endorsements?: string[];
}

export interface Experience {
  id: number;
  company: string;
  position: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  city?: string;
  workMode?: string;
  contractType?: string;
  functions?: string;
  achievements?: string;
  tools?: string;
  learnedSkills?: string[];
}

export interface Education {
  id: number;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  educationType?: string;
  formationLevel?: string;
  description?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  technologies: string[];
  repositoryUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  role?: string;
  responsibilities?: string;
  projectType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProfileViewsResponse {
  count: number;
}

export interface CvDocument {
  id: number;
  originalName: string;
  mimeType: string;
  extractedText?: string;
  uploadedAt: string;
  analyses?: CvAnalysis[];
}

export interface CvAnalysis {
  id: number;
  score: number;
  strengths: string[];
  recommendations: string[];
  createdAt: string;
}
