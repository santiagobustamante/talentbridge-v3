import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CvDocument, CvAnalysis } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly api = `${environment.apiUrl}/cv`;
  // Va directo a portfolio-service (no por el gateway) -- necesita su propio
  // dominio público en producción, ver environment.prod.ts.
  private readonly uploadApi = `${environment.cvUploadUrl}/api/cv`;

  constructor(private http: HttpClient) {}

  upload(file: File): Observable<CvDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CvDocument>(`${this.uploadApi}/upload`, formData, {
      withCredentials: true,
    });
  }

  getAll(): Observable<CvDocument[]> {
    return this.http.get<CvDocument[]>(this.api);
  }

  getOne(id: number): Observable<CvDocument> {
    return this.http.get<CvDocument>(`${this.api}/${id}`);
  }

  analyze(id: number): Observable<CvAnalysis> {
    return this.http.post<CvAnalysis>(`${this.api}/${id}/analyze`, {});
  }

  getAnalyses(id: number): Observable<CvAnalysis[]> {
    return this.http.get<CvAnalysis[]>(`${this.api}/${id}/analyses`);
  }
}
