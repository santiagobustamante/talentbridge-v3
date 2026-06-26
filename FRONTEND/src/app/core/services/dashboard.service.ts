import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  skillsRequired?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  company?: { companyName: string } | null;
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
  candidateName?: string;
  lastMessage?: string | null;
  lastMessageAt?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getCandidateDashboard(): Observable<CandidateDashboard> {
    return this.http.get<CandidateDashboard>(`${this.api}/dashboard/candidate`);
  }

  getCompanyDashboard(): Observable<CompanyDashboard> {
    return this.http.get<CompanyDashboard>(`${this.api}/dashboard/company`);
  }
}
