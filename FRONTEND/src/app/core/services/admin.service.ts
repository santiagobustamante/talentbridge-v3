import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ParameterType = 'BOOLEAN' | 'NUMBER' | 'STRING' | 'JSON';

export interface SystemParameter {
  id: number;
  key: string;
  category: string;
  type: ParameterType;
  value: string;
  defaultValue: string;
  minValue: number | null;
  maxValue: number | null;
  allowedValues: string[] | null;
  description: string;
  riskLevel: number;
  updatedAt: string;
  updatedById: number | null;
}

export interface AdminAuditLogEntry {
  id: number;
  adminId: number;
  admin: { email: string };
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedAuditLog {
  data: AdminAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface SystemCatalogEntry {
  id: number;
  catalogKey: string;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

export interface CatalogGroup {
  catalogKey: string;
  entries: SystemCatalogEntry[];
}

export interface AdminUser {
  id: number;
  email: string;
  role: 'CANDIDATE' | 'COMPANY' | 'ADMIN';
  emailVerified: boolean;
  suspended: boolean;
  createdAt: string;
  profile?: { fullName: string | null } | null;
  companyProfile?: { companyName: string | null } | null;
}

export interface PaginatedUsers {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDashboardStats {
  users: { candidates: number; companies: number; admins: number; suspended: number };
  jobOffers: { draft: number; published: number; closed: number; archived: number };
  totalApplications: number;
  pendingReports: number;
}

export type ReportTargetType = 'JOB_OFFER' | 'CHAT_MESSAGE' | 'USER';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN';

export interface AdminReport {
  id: number;
  reporterId: number;
  reporter: { email: string };
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  status: ReportStatus;
  reviewedById: number | null;
  reviewedBy: { email: string } | null;
  reviewedAt: string | null;
  createdAt: string;
  target: { id: number; title?: string; status?: string; body?: string; senderId?: number; email?: string; suspended?: boolean } | null;
}

export interface PaginatedReports {
  data: AdminReport[];
  total: number;
  page: number;
  limit: number;
}

/** Cliente HTTP del panel de administración (admin-service, vía el gateway). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listParameters(): Observable<SystemParameter[]> {
    return this.http.get<SystemParameter[]>(`${this.api}/admin/parameters`);
  }

  updateParameter(key: string, value: string): Observable<SystemParameter> {
    return this.http.patch<SystemParameter>(`${this.api}/admin/parameters/${key}`, { value });
  }

  listAuditLog(page: number, limit: number, filters?: { entityType?: string; from?: string; to?: string }): Observable<PaginatedAuditLog> {
    const params: Record<string, string | number> = { page, limit };
    if (filters?.entityType) params['entityType'] = filters.entityType;
    if (filters?.from) params['from'] = filters.from;
    if (filters?.to) params['to'] = filters.to;
    return this.http.get<PaginatedAuditLog>(`${this.api}/admin/audit-log`, { params });
  }

  listAuditLogEntityTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/admin/audit-log/entity-types`);
  }

  listCatalogs(): Observable<CatalogGroup[]> {
    return this.http.get<CatalogGroup[]>(`${this.api}/admin/catalogs`);
  }

  createCatalogEntry(catalogKey: string, value: string, label: string): Observable<SystemCatalogEntry> {
    return this.http.post<SystemCatalogEntry>(`${this.api}/admin/catalogs/${catalogKey}`, { value, label });
  }

  updateCatalogEntry(id: number, changes: { active?: boolean; label?: string }): Observable<SystemCatalogEntry> {
    return this.http.patch<SystemCatalogEntry>(`${this.api}/admin/catalogs/entry/${id}`, changes);
  }

  listUsers(params: { role?: string; q?: string; page: number; limit: number }): Observable<PaginatedUsers> {
    const httpParams: Record<string, string | number> = { page: params.page, limit: params.limit };
    if (params.role) httpParams['role'] = params.role;
    if (params.q) httpParams['q'] = params.q;
    return this.http.get<PaginatedUsers>(`${this.api}/admin/users`, { params: httpParams });
  }

  setUserSuspended(id: number, suspended: boolean): Observable<{ id: number; email: string; suspended: boolean }> {
    return this.http.patch<{ id: number; email: string; suspended: boolean }>(`${this.api}/admin/users/${id}/suspend-state`, { suspended });
  }

  getDashboardStats(): Observable<AdminDashboardStats> {
    return this.http.get<AdminDashboardStats>(`${this.api}/admin/dashboard`);
  }

  listReports(params: { status?: string; targetType?: string; page: number; limit: number }): Observable<PaginatedReports> {
    const httpParams: Record<string, string | number> = { page: params.page, limit: params.limit };
    if (params.status) httpParams['status'] = params.status;
    if (params.targetType) httpParams['targetType'] = params.targetType;
    return this.http.get<PaginatedReports>(`${this.api}/admin/moderation`, { params: httpParams });
  }

  resolveReport(id: number, status: 'DISMISSED' | 'ACTION_TAKEN'): Observable<AdminReport> {
    return this.http.patch<AdminReport>(`${this.api}/admin/moderation/${id}`, { status });
  }
}
