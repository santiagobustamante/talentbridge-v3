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

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  sendMessage(message: string, history?: AssistantHistoryItem[]): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(
      `${this.api}/assistant/message`,
      { message, history },
      { withCredentials: true },
    );
  }
}
