export type HotelCategory = 'all' | 'hotel' | 'bnb' | 'apartment';
export type SortMode = 'nearest' | 'best-rated' | 'recommended';
export type AppLanguage = 'en' | 'de' | 'it';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Accommodation {
  id: string;
  name: string;
  town: string;
  address: string;
  type: string;
  category: Exclude<HotelCategory, 'all'>;
  description: string;
  phone: string;
  website: string;
  imageUrl: string;
  tags: string[];
  lat: number;
  lng: number;
  distanceKm: number;
}

export interface FilterState {
  radiusKm: 2 | 5 | 10 | 20;
  category: HotelCategory;
  sort: SortMode;
  search: string;
}

export interface RouteSummary {
  distanceKm: number;
  driveMinutes: number;
  bikeMinutes: number;
  walkMinutes: number;
}

export interface AccommodationsResponse {
  source: 'opendatahub' | 'fallback';
  language?: AppLanguage;
  center: GeoPoint;
  radiusKm: number;
  total: number;
  warning?: string;
  items: Accommodation[];
}
