import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AssistantAction {
  label: string;
  route: string;
}

export interface AssistantResult {
  fullName?: string;
  professionalTitle?: string;
  profession?: string;
  city?: string;
  slug?: string;
  skills?: string[];
}

export interface AssistantResponse {
  reply: string;
  role: string;
  intent: string;
  actions: AssistantAction[];
  results: AssistantResult[];
}

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Cliente del asistente conversacional con IA ("Joaquín") que ayuda a
 * buscar candidatos/ofertas por lenguaje natural (assistant-service en el
 * backend, que a su vez usa deepseek.service.ts). El frontend le manda el
 * historial de la conversación en cada request porque el backend no
 * mantiene estado de sesión de chat entre llamadas: cada request al
 * assistant es independiente y necesita el contexto completo para
 * responder con coherencia.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Envía un mensaje del usuario al asistente junto con el historial previo, y recibe la respuesta con posibles acciones sugeridas (navegar a una ruta) y resultados (candidatos/ofertas encontrados). */
  sendMessage(message: string, history?: AssistantHistoryItem[]): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(
      `${this.api}/assistant/message`,
      { message, history },
      { withCredentials: true },
    );
  }
}
