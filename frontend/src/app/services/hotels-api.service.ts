import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccommodationsResponse, AppLanguage, FilterState, GeoPoint } from '../models/accommodation.model';

@Injectable({ providedIn: 'root' })
export class HotelsApiService {
  private readonly baseUrl = 'http://localhost:4000/api';

  constructor(private readonly http: HttpClient) {}

  getNearbyHotels(
    center: GeoPoint,
    filters: FilterState,
    language: AppLanguage,
    limit = 20
  ): Observable<AccommodationsResponse> {
    const params = new HttpParams()
      .set('lat', center.lat)
      .set('lng', center.lng)
      .set('lang', language)
      .set('radiusKm', filters.radiusKm)
      .set('category', filters.category)
      .set('sort', filters.sort)
      .set('search', filters.search)
      .set('limit', limit);

    return this.http.get<AccommodationsResponse>(`${this.baseUrl}/accommodations`, { params });
  }
}
