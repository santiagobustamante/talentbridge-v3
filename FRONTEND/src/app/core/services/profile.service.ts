import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Profile, ProfileViewsResponse } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = 'http://localhost:3000/api';
  private profileCache$: Observable<Profile> | null = null;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<Profile> {
    if (!this.profileCache$) {
      this.profileCache$ = this.http
        .get<Profile>(`${this.api}/profile`)
        .pipe(shareReplay(1));
    }
    return this.profileCache$;
  }

  invalidateCache(): void {
    this.profileCache$ = null;
  }

  updateProfile(data: Partial<Profile>): Observable<Profile> {
    return this.http
      .patch<Profile>(`${this.api}/profile`, data)
      .pipe(tap(() => this.invalidateCache()));
  }

  getProfileViews(): Observable<ProfileViewsResponse> {
    return this.http.get<ProfileViewsResponse>(`${this.api}/profile/views`);
  }
}
