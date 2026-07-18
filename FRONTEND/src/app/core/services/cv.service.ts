import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CvDocument, CvAnalysis } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/**
 * Gestión de CVs subidos por el candidato y su análisis automático con IA
 * (feature `/app/cv-analysis`). La subida de archivo (`upload`) usa una URL
 * distinta (`uploadApi`) al resto de los métodos: ver el comentario en
 * `uploadApi` sobre por qué ese endpoint no pasa por el API Gateway.
 */
@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly api = `${environment.apiUrl}/cv`;
  // Va directo a portfolio-service (no por el gateway) -- necesita su propio
  // dominio público en producción, ver environment.prod.ts.
  private readonly uploadApi = `${environment.cvUploadUrl}/api/cv`;

  constructor(private http: HttpClient) {}

  /** Sube un archivo de CV (PDF/Word) como multipart/form-data directo a portfolio-service. */
  upload(file: File): Observable<CvDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CvDocument>(`${this.uploadApi}/upload`, formData, {
      withCredentials: true,
    });
  }

  /** Lista todos los CVs subidos por el candidato autenticado. */
  getAll(): Observable<CvDocument[]> {
    return this.http.get<CvDocument[]>(this.api);
  }

  /** Obtiene un CV puntual, incluyendo el texto extraído del documento. */
  getOne(id: number): Observable<CvDocument> {
    return this.http.get<CvDocument>(`${this.api}/${id}`);
  }

  /** Dispara el análisis del CV con IA (deepseek.service.ts en el backend) y devuelve puntaje, fortalezas y recomendaciones. */
  analyze(id: number): Observable<CvAnalysis> {
    return this.http.post<CvAnalysis>(`${this.api}/${id}/analyze`, {});
  }

  /** Obtiene el historial de análisis ya generados para un CV. */
  getAnalyses(id: number): Observable<CvAnalysis[]> {
    return this.http.get<CvAnalysis[]>(`${this.api}/${id}/analyses`);
  }
}
