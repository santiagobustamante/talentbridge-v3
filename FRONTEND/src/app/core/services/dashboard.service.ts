import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CandidateDashboard {
  profilePercent: number;
  skillsCount: number;
  projectsCount: number;
  applicationsCount: number;
  unreadMessagesCount: number;
  profileViewsCount: number;
  isPublished: boolean;
  recentJobs: DashboardJob[];
  recentApplications: DashboardApplication[];
  recentConversations: DashboardConversation[];
  nextStep: { label: string; action: string; route: string };
}

export interface CompanyDashboard {
  companyName: string | null;
  logoUrl?: string | null;
  candidatesCount: number;
  publishedJobsCount: number;
  draftJobsCount: number;
  closedJobsCount: number;
  totalJobsCount: number;
  applicationsCount: number;
  unreadMessagesCount: number;
  recentJobs: CompanyJob[];
  recentApplications: DashboardApplication[];
  recentConversations: DashboardConversation[];
}

export interface DashboardJob {
  id: number;
  title: string;
  city?: string;
  modality?: string;
  contractType?: string;
  customContractType?: string;
  workload?: string;
  customWorkload?: string;
  skillsRequired?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  publishedAt?: string;
  createdAt?: string;
  company?: { companyName: string; logoUrl?: string | null } | null;
}

export interface DashboardApplication {
  id: number;
  jobId: number;
  jobTitle: string;
  candidateName?: string;
  candidateSlug?: string;
  candidateId?: number;
  status: string;
  createdAt: string;
}

export interface CompanyJob {
  id: number;
  title: string;
  city?: string;
  modality?: string;
  status: string;
  applicationsCount: number;
  publishedAt?: string;
}

export interface DashboardConversation {
  id: number;
  companyName?: string;
  logoUrl?: string | null;
  candidateName?: string;
  lastMessage?: string | null;
  lastMessageAt?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCandidateDashboard(): Observable<CandidateDashboard> {
    return this.http.get<CandidateDashboard>(`${this.api}/dashboard/candidate`);
  }

  getCompanyDashboard(): Observable<CompanyDashboard> {
    return this.http.get<CompanyDashboard>(`${this.api}/dashboard/company`);
  }
}
