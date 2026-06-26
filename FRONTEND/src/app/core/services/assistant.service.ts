import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(
      `${this.api}/assistant/message`,
      { message },
      { withCredentials: true },
    );
  }
}
