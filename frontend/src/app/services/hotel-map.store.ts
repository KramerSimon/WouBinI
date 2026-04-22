import { Injectable, computed, signal } from '@angular/core';
import { Accommodation, AppLanguage, FilterState, GeoPoint } from '../models/accommodation.model';
import { HotelsApiService } from './hotels-api.service';

const DEFAULT_CENTER: GeoPoint = { lat: 46.4983, lng: 11.3548 };

@Injectable({ providedIn: 'root' })
export class HotelMapStore {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly source = signal<'opendatahub' | 'fallback' | null>(null);
  readonly warning = signal<string | null>(null);

  readonly center = signal<GeoPoint>(DEFAULT_CENTER);
  readonly language = signal<AppLanguage>('en');
  readonly userLocation = signal<GeoPoint | null>(null);
  readonly hotels = signal<Accommodation[]>([]);
  readonly selectedHotelId = signal<string | null>(null);

  readonly filters = signal<FilterState>({
    radiusKm: 10,
    category: 'all',
    sort: 'nearest',
    search: ''
  });

  readonly selectedHotel = computed(() => {
    const selectedId = this.selectedHotelId();
    if (!selectedId) return null;
    return this.hotels().find((hotel) => hotel.id === selectedId) ?? null;
  });

  readonly hotelCountLabel = computed(() => {
    const total = this.hotels().length;
    return `${total} ${total === 1 ? 'hotel' : 'hotels'} nearby`;
  });

  constructor(private readonly api: HotelsApiService) {}

  setUserLocation(point: GeoPoint): void {
    this.userLocation.set(point);
    this.center.set(point);
  }

  setCenter(point: GeoPoint): void {
    this.center.set(point);
  }

  setSearch(search: string): void {
    this.filters.update((prev) => ({ ...prev, search }));
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
  }

  setRadius(radiusKm: 2 | 5 | 10 | 20): void {
    this.filters.update((prev) => ({ ...prev, radiusKm }));
  }

  setCategory(category: FilterState['category']): void {
    this.filters.update((prev) => ({ ...prev, category }));
  }

  setSort(sort: FilterState['sort']): void {
    this.filters.update((prev) => ({ ...prev, sort }));
  }

  selectHotel(id: string): void {
    this.selectedHotelId.set(id);
  }

  loadHotels(limit = 20): void {
    const center = this.userLocation() ?? this.center();
    const filters = this.filters();
    const language = this.language();

    this.loading.set(true);
    this.error.set(null);

    this.api.getNearbyHotels(center, filters, language, limit).subscribe({
      next: (response) => {
        this.hotels.set(response.items);
        this.source.set(response.source);
        this.warning.set(response.warning ?? null);
        this.loading.set(false);

        if (response.items.length === 0) {
          this.selectedHotelId.set(null);
          return;
        }

        const currentSelected = this.selectedHotelId();
        const stillExists = response.items.some((hotel) => hotel.id === currentSelected);
        // Keep the previous selection when possible to avoid jarring map jumps.
        if (currentSelected && stillExists) {
          return;
        }

        this.selectedHotelId.set(response.items[0].id);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load accommodations. Please try again.');
      }
    });
  }
}
