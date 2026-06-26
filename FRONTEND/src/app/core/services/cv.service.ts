import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CvDocument, CvAnalysis } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly api = 'http://localhost:3000/api/cv';
  private readonly uploadApi = 'http://localhost:3003/api/cv';

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
