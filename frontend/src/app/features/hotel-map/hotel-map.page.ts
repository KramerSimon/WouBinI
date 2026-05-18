import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HotelMapStore } from '../../services/hotel-map.store';
import { Accommodation, AppLanguage, GeoPoint, RouteSummary } from '../../models/accommodation.model';

type RouteMode = 'driving' | 'cycling' | 'walking';

interface UiCopy {
  siteSubtitle: string;
  searchPlaceholder: string;
  searchAria: string;
  useMyLocation: string;
  locating: string;
  filters: string;
  nearUser: string;
  nearBolzano: string;
  hotelsNearby: string;
  category: string;
  sort: string;
  modeDrive: string;
  modeBike: string;
  modeWalk: string;
  sortNearest: string;
  sortSummer: string;
  sortWinter: string;
  sortYearRound: string;
  sortBestRated: string;
  sortRecommended: string;
  catAll: string;
  catHotel: string;
  catBnb: string;
  catApartment: string;
  catAttraction: string;
  tagSummer: string;
  tagWinter: string;
  tagYearRound: string;
  tagCulture: string;
  tagGastronomy: string;
  tagShopping: string;
  tagBreakfast: string;
  tagParking: string;
  tagSpa: string;
  tagKitchen: string;
  tagLocal: string;
  loadingHotels: string;
  noHotels: string;
  kmAway: string;
  route: string;
  details: string;
  hideDetails: string;
  selected: string;
  close: string;
  addressUnavailable: string;
  descriptionUnavailable: string;
  phoneUnavailable: string;
  website: string;
  car: string;
  bike: string;
  walk: string;
  loadingRoute: string;
  routeFallback: string;
  recenter: string;
  showAllHotels: string;
  trackLive: string;
  stopTracking: string;
  youAreHere: string;
  allowLocationPrompt: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  featuredTitle: string;
  featuredSubtitle: string;
  dataTitle: string;
  dataText: string;
}

const UI_COPY: Record<AppLanguage, UiCopy> = {
  en: {
    siteSubtitle: 'Hotels near you in South Tyrol',
    searchPlaceholder: 'Town, hotel name, or address',
    searchAria: 'Search hotels',
    useMyLocation: 'Use my location',
    locating: 'Locating...',
    filters: 'Filters',
    nearUser: 'Near your location',
    nearBolzano: 'Near Bolzano',
    hotelsNearby: 'hotels nearby',
    category: 'Category',
    sort: 'Sort',
    modeDrive: 'Drive',
    modeBike: 'Bike',
    modeWalk: 'Walk',
    sortNearest: 'Nearest',
    sortSummer: 'Summer',
    sortWinter: 'Winter',
    sortYearRound: 'Year-round',
    sortBestRated: 'Best rated',
    sortRecommended: 'Recommended',
    catAll: 'All Accommodations',
    catHotel: 'Hotels',
    catBnb: 'B&B',
    catApartment: 'Apartments',
    catAttraction: 'Attractions',
    tagSummer: 'Summer',
    tagWinter: 'Winter',
    tagYearRound: 'Year-round',
    tagCulture: 'Culture',
    tagGastronomy: 'Gastronomy',
    tagShopping: 'Shopping',
    tagBreakfast: 'Breakfast',
    tagParking: 'Parking',
    tagSpa: 'Spa',
    tagKitchen: 'Kitchen',
    tagLocal: 'Local',
    loadingHotels: 'Loading accommodations...',
    noHotels: 'No accommodations found for these filters.',
    kmAway: 'km away',
    route: 'Route',
    details: 'Details',
    hideDetails: 'Hide Details',
    selected: 'Selected',
    close: 'Close',
    addressUnavailable: 'Address unavailable',
    descriptionUnavailable: 'No description available yet.',
    phoneUnavailable: 'Phone unavailable',
    website: 'Website',
    car: 'Car',
    bike: 'Bike',
    walk: 'Walk',
    loadingRoute: 'Loading street route...',
    routeFallback: 'Street route unavailable right now. Showing direct line.',
    recenter: 'Recenter',
    showAllHotels: 'Show all hotels',
    trackLive: 'Track live position',
    stopTracking: 'Stop live tracking',
    youAreHere: 'You are here',
    allowLocationPrompt: 'Allow location to find hotels near you.',
    heroTitle: 'Find hotels near you in South Tyrol',
    heroSubtitle: 'Select a hotel and instantly get a route from your current position.',
    heroCta: 'Use my location',
    featuredTitle: 'Featured destinations',
    featuredSubtitle: 'Bolzano, Merano, Bressanone, Ortisei',
    dataTitle: 'Open Data Hub powered',
    dataText: 'Accommodation data is provided by Open Data Hub South Tyrol.'
  },
  de: {
    siteSubtitle: 'Hotels in Ihrer Nähe in Südtirol',
    searchPlaceholder: 'Ort, Hotelname oder Adresse',
    searchAria: 'Hotels suchen',
    useMyLocation: 'Meinen Standort nutzen',
    locating: 'Standort wird ermittelt...',
    filters: 'Filter',
    nearUser: 'In Ihrer Nähe',
    nearBolzano: 'Nahe Bozen',
    hotelsNearby: 'Hotels in der Nähe',
    category: 'Kategorie',
    sort: 'Sortierung',
    modeDrive: 'Auto',
    modeBike: 'Rad',
    modeWalk: 'Zu Fuß',
    sortNearest: 'In der Nähe',
    sortSummer: 'Sommer',
    sortWinter: 'Winter',
    sortYearRound: 'Ganzjährig',
    sortBestRated: 'Bestbewertet',
    sortRecommended: 'Empfohlen',
    catAll: 'Alle Unterkünfte',
    catHotel: 'Hotels',
    catBnb: 'B&B',
    catApartment: 'Apartments',
    catAttraction: 'Sehenswürdigkeiten',
    tagSummer: 'Sommer',
    tagWinter: 'Winter',
    tagYearRound: 'Ganzjährig',
    tagCulture: 'Kultur',
    tagGastronomy: 'Gastronomie',
    tagShopping: 'Einkaufen',
    tagBreakfast: 'Frühstück',
    tagParking: 'Parkplatz',
    tagSpa: 'Spa',
    tagKitchen: 'Küche',
    tagLocal: 'Lokal',
    loadingHotels: 'Unterkünfte werden geladen...',
    noHotels: 'Für diese Filter wurden keine Unterkünfte gefunden.',
    kmAway: 'km entfernt',
    route: 'Route',
    details: 'Details',
    hideDetails: 'Details ausblenden',
    selected: 'Ausgewählt',
    close: 'Schließen',
    addressUnavailable: 'Adresse nicht verfügbar',
    descriptionUnavailable: 'Noch keine Beschreibung verfügbar.',
    phoneUnavailable: 'Telefon nicht verfügbar',
    website: 'Webseite',
    car: 'Auto',
    bike: 'Rad',
    walk: 'Zu Fuß',
    loadingRoute: 'Straßenroute wird geladen...',
    routeFallback: 'Straßenroute derzeit nicht verfügbar. Direkte Linie wird angezeigt.',
    recenter: 'Neu zentrieren',
    showAllHotels: 'Alle Hotels zeigen',
    trackLive: 'Live-Position verfolgen',
    stopTracking: 'Live-Verfolgung stoppen',
    youAreHere: 'Sie sind hier',
    allowLocationPrompt: 'Standort erlauben, um Hotels in Ihrer Nähe zu finden.',
    heroTitle: 'Finden Sie Hotels in Ihrer Nähe in Südtirol',
    heroSubtitle: 'Hotel auswählen und sofort die Route vom aktuellen Standort sehen.',
    heroCta: 'Meinen Standort nutzen',
    featuredTitle: 'Ausgewählte Orte',
    featuredSubtitle: 'Bozen, Meran, Brixen, St. Ulrich',
    dataTitle: 'Mit Open Data Hub',
    dataText: 'Unterkunftsdaten werden vom Open Data Hub Südtirol bereitgestellt.'
  },
  it: {
    siteSubtitle: 'Hotel vicino a te in Alto Adige',
    searchPlaceholder: 'Paese, hotel o indirizzo',
    searchAria: 'Cerca hotel',
    useMyLocation: 'Usa la mia posizione',
    locating: 'Rilevamento posizione...',
    filters: 'Filtri',
    nearUser: 'Vicino alla tua posizione',
    nearBolzano: 'Vicino a Bolzano',
    hotelsNearby: 'hotel nelle vicinanze',
    category: 'Categoria',
    sort: 'Ordina',
    modeDrive: 'Auto',
    modeBike: 'Bici',
    modeWalk: 'A piedi',
    sortNearest: 'Più vicini',
    sortSummer: 'Estate',
    sortWinter: 'Inverno',
    sortYearRound: 'Tutto l\'anno',
    sortBestRated: 'Meglio valutati',
    sortRecommended: 'Consigliati',
    catAll: 'Tutti gli alloggi',
    catHotel: 'Hotel',
    catBnb: 'B&B',
    catApartment: 'Appartamenti',
    catAttraction: 'Attrazioni',
    tagSummer: 'Estate',
    tagWinter: 'Inverno',
    tagYearRound: 'Tutto l\'anno',
    tagCulture: 'Cultura',
    tagGastronomy: 'Gastronomia',
    tagShopping: 'Shopping',
    tagBreakfast: 'Colazione',
    tagParking: 'Parcheggio',
    tagSpa: 'Spa',
    tagKitchen: 'Cucina',
    tagLocal: 'Locale',
    loadingHotels: 'Caricamento strutture...',
    noHotels: 'Nessuna struttura trovata con questi filtri.',
    kmAway: 'km di distanza',
    route: 'Percorso',
    details: 'Dettagli',
    hideDetails: 'Nascondi dettagli',
    selected: 'Selezionato',
    close: 'Chiudi',
    addressUnavailable: 'Indirizzo non disponibile',
    descriptionUnavailable: 'Descrizione non ancora disponibile.',
    phoneUnavailable: 'Telefono non disponibile',
    website: 'Sito web',
    car: 'Auto',
    bike: 'Bici',
    walk: 'A piedi',
    loadingRoute: 'Caricamento percorso stradale...',
    routeFallback: 'Percorso stradale non disponibile al momento. Mostro una linea diretta.',
    recenter: 'Ricentra',
    showAllHotels: 'Mostra tutti gli hotel',
    trackLive: 'Traccia posizione live',
    stopTracking: 'Ferma tracciamento live',
    youAreHere: 'Sei qui',
    allowLocationPrompt: 'Consenti la posizione per trovare hotel vicino a te.',
    heroTitle: 'Trova hotel vicino a te in Alto Adige',
    heroSubtitle: 'Seleziona un hotel e visualizza subito il percorso dalla tua posizione.',
    heroCta: 'Usa la mia posizione',
    featuredTitle: 'Destinazioni in evidenza',
    featuredSubtitle: 'Bolzano, Merano, Bressanone, Ortisei',
    dataTitle: 'Powered by Open Data Hub',
    dataText: 'I dati delle strutture provengono da Open Data Hub Alto Adige.'
  }
};

@Component({
  selector: 'app-hotel-map-page',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule
  ],
  templateUrl: './hotel-map.page.html',
  styleUrl: './hotel-map.page.scss'
})
export class HotelMapPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost', { static: true })
  private readonly mapHost!: ElementRef<HTMLDivElement>;

  @ViewChild('detailsDrawer')
  private detailsDrawer?: ElementRef<HTMLElement>;

  readonly store = inject(HotelMapStore);

  readonly radii: Array<2 | 5 | 10 | 20> = [2, 5, 10, 20];
  readonly categoryOptions = computed(() => {
    const c = this.copy();
    return [
      { label: c.catAll, value: 'all' as const },
      { label: c.catHotel, value: 'hotel' as const },
      { label: c.catBnb, value: 'bnb' as const },
      { label: c.catApartment, value: 'apartment' as const },
      { label: c.catAttraction, value: 'attraction' as const }
    ];
  });
  readonly sortOptions = computed(() => {
    const isAttraction = this.store.isAttractionMode();
    const c = this.copy();
    if (isAttraction) {
      return [
        { label: c.sortNearest, value: 'nearest' as const },
        { label: c.sortSummer, value: 'summer' as const },
        { label: c.sortWinter, value: 'winter' as const },
        { label: c.sortYearRound, value: 'year-round' as const }
      ];
    }
    return [
      { label: c.sortNearest, value: 'nearest' as const },
      { label: c.sortBestRated, value: 'best-rated' as const },
      { label: c.sortRecommended, value: 'recommended' as const }
    ];
  });

  translateTag(tag: string): string {
    const c = this.copy();
    const map: Record<string, string> = {
      Summer: c.tagSummer,
      Winter: c.tagWinter,
      'Year-round': c.tagYearRound,
      Culture: c.tagCulture,
      Gastronomy: c.tagGastronomy,
      Shopping: c.tagShopping,
      Breakfast: c.tagBreakfast,
      Parking: c.tagParking,
      Spa: c.tagSpa,
      Kitchen: c.tagKitchen,
      Local: c.tagLocal
    };
    return map[tag] ?? tag;
  }
  readonly featuredAreas: Array<{ label: string; point: GeoPoint }> = [
    { label: 'Bolzano', point: { lat: 46.4983, lng: 11.3548 } },
    { label: 'Merano', point: { lat: 46.6696, lng: 11.1596 } },
    { label: 'Bressanone', point: { lat: 46.7150, lng: 11.6560 } },
    { label: 'Ortisei', point: { lat: 46.5753, lng: 11.6720 } }
  ];

  readonly selectedHotel = this.store.selectedHotel;
  readonly language = this.store.language;
  readonly languageLabel = computed(() => this.language().toUpperCase());
  readonly copy = computed(() => UI_COPY[this.language()]);
  readonly routeSummary = computed(() => this.buildRouteSummary(this.selectedHotel()));
  readonly routeMode = signal<RouteMode>('driving');
  readonly isLocating = signal(false);
  readonly isTrackingLive = signal(false);
  readonly expandedHotelId = signal<string | null>(null);
  readonly routeHotelId = signal<string | null>(null);
  readonly pendingRouteHotelId = signal<string | null>(null);
  readonly routeLoading = signal(false);
  readonly routeError = signal<string | null>(null);
  readonly routeModes = computed(() => [
    { value: 'driving' as RouteMode, label: this.copy().modeDrive },
    { value: 'cycling' as RouteMode, label: this.copy().modeBike },
    { value: 'walking' as RouteMode, label: this.copy().modeWalk }
  ]);

  readonly isMobileSheetExpanded = signal(false);
  readonly sheetOffsetPx = signal(0);

  private map: L.Map | null = null;
  private hotelLayer: L.MarkerClusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 44,
    disableClusteringAtZoom: 14,
    spiderfyOnMaxZoom: true,
    spiderfyDistanceMultiplier: 1.2,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      return L.divIcon({
        className: 'hotel-cluster-icon',
        html: `<span>${count}</span>`,
        iconSize: [34, 34]
      });
    }
  });
  private selectedHotelLayer = L.layerGroup();
  private routeLayer = L.layerGroup();
  private userMarker: L.Marker | null = null;
  private userAccuracyCircle: L.Circle | null = null;
  private markerByHotelId = new Map<string, L.Marker>();
  private geolocationWatchId: number | null = null;
  private routeRequestToken = 0;
  private lastFitSignature = '';
  private pendingRouteFit = false;

  private dragStartY = 0;
  private dragStartOffset = 0;
  private searchDebounceTimer: number | null = null;
  private routeDebounceTimer: number | null = null;

  constructor() {
    effect(() => {
      const hotels = this.store.hotels();
      const selected = this.store.selectedHotel();
      const userLocation = this.store.userLocation();
      this.renderHotels(hotels, selected, userLocation);
    });

    effect(() => {
      const selected = this.store.selectedHotel();
      const userLocation = this.store.userLocation();
      const mode = this.routeMode();
      this.scheduleRenderRoute(userLocation, selected, mode);
    });
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.invalidateMapSizeSoon();
    this.loadInitialHotels();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      window.clearTimeout(this.searchDebounceTimer);
    }
    if (this.routeDebounceTimer) {
      window.clearTimeout(this.routeDebounceTimer);
    }
    this.stopLocationWatch();
    this.map?.remove();
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.store.error.set('Geolocation is not available on this device.');
      return;
    }

    if (this.isLocating()) {
      return;
    }

    this.isLocating.set(true);
    this.store.error.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating.set(false);

        if (position.coords.accuracy > 10000) {
          this.store.error.set('Location too inaccurate. Showing accommodations around Bolzano.');
          this.pendingRouteHotelId.set(null);
          this.store.loadHotels();
          return;
        }

        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.store.setUserLocation(point);
        this.store.loadHotels();
        this.flyTo(point, 12);
        this.startLocationWatch();

        const pendingHotelId = this.pendingRouteHotelId();
        if (pendingHotelId) {
          const pendingHotel = this.store.hotels().find((hotel) => hotel.id === pendingHotelId);
          if (pendingHotel) {
            this.selectHotel(pendingHotel);
            this.routeHotelId.set(pendingHotelId);
          }
          this.pendingRouteHotelId.set(null);
        }
      },
      () => {
        this.isLocating.set(false);
        this.isTrackingLive.set(false);
        this.pendingRouteHotelId.set(null);
        this.store.error.set('Location denied. Showing accommodations around Bolzano.');
        this.store.loadHotels();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  onSearch(value: string): void {
    this.store.setSearch(value);
    if (this.searchDebounceTimer) {
      window.clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = window.setTimeout(() => {
      this.store.loadHotels();
    }, 260);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.onSearch(target?.value ?? '');
  }

  onRadiusChange(radiusKm: 2 | 5 | 10 | 20): void {
    this.store.setRadius(radiusKm);
    this.store.loadHotels();
  }

  onCategoryChange(category: 'all' | 'hotel' | 'bnb' | 'apartment' | 'attraction'): void {
    this.store.setCategory(category);
    this.store.loadHotels();
  }

  onSortChange(sort: 'nearest' | 'best-rated' | 'recommended' | 'summer' | 'winter' | 'year-round'): void {
    this.store.setSort(sort);
    this.store.loadHotels();
  }

  setRouteMode(mode: RouteMode): void {
    this.routeMode.set(mode);
  }

  cycleLanguage(): void {
    const next = this.getNextLanguage(this.language());
    this.store.setLanguage(next);
    this.store.loadHotels();
  }

  selectHotel(hotel: Accommodation): void {
    this.store.selectHotel(hotel.id);
    this.pendingRouteFit = true;

    if (!this.store.userLocation()) {
      this.flyTo({ lat: hotel.lat, lng: hotel.lng }, 13);
    }

    this.revealHotelMarker(hotel.id);
  }

  toggleDetails(hotel: Accommodation): void {
    if (this.expandedHotelId() === hotel.id) {
      this.expandedHotelId.set(null);
    } else {
      this.selectHotel(hotel);
      this.expandedHotelId.set(hotel.id);
    }
  }

  openDetails(hotel: Accommodation): void {
    this.selectHotel(hotel);
    this.scrollDetailsIntoView();
  }

  closeDetails(): void {
    this.routeHotelId.set(null);
  }

  toggleLiveTracking(): void {
    if (this.isTrackingLive()) {
      this.stopLocationWatch();
      return;
    }

    if (!this.store.userLocation()) {
      this.useMyLocation();
      return;
    }

    this.startLocationWatch();
  }

  routeToHotel(hotel: Accommodation): void {
    if (this.routeHotelId() === hotel.id) {
      this.routeHotelId.set(null);
      return;
    }

    this.selectHotel(hotel);
    this.routeHotelId.set(hotel.id);

    if (!this.store.userLocation()) {
      this.pendingRouteHotelId.set(hotel.id);
      this.store.error.set('Allow location to draw route from your position.');
      this.useMyLocation();
    }
  }

  recenter(): void {
    const user = this.store.userLocation();
    if (!user) {
      this.fitAll();
      return;
    }
    this.flyTo(user, 12);
  }

  fitAll(): void {
    if (!this.map) return;

    const hotels = this.store.hotels();
    const user = this.store.userLocation();
    const latLngs: L.LatLngExpression[] = [];

    if (user) {
      latLngs.push([user.lat, user.lng]);
    }

    for (const hotel of hotels) {
      latLngs.push([hotel.lat, hotel.lng]);
    }

    if (latLngs.length === 0) {
      this.map.setView([46.4983, 11.3548], 10);
      return;
    }

    const bounds = L.latLngBounds(latLngs);
    this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  toggleMobileSheet(): void {
    const nextExpanded = !this.isMobileSheetExpanded();
    this.isMobileSheetExpanded.set(nextExpanded);
    this.sheetOffsetPx.set(nextExpanded ? 0 : 220);
    this.invalidateMapSizeSoon();
  }

  openMobileFilters(): void {
    this.isMobileSheetExpanded.set(true);
    this.sheetOffsetPx.set(0);
    this.invalidateMapSizeSoon();
  }

  chooseFeaturedArea(point: GeoPoint): void {
    this.store.setCenter(point);
    this.store.loadHotels();
    this.flyTo(point, 11);
  }

  onSheetDragStart(event: PointerEvent): void {
    this.dragStartY = event.clientY;
    this.dragStartOffset = this.sheetOffsetPx();
  }

  onSheetDragMove(event: PointerEvent): void {
    if (this.dragStartY === 0) {
      return;
    }

    const delta = event.clientY - this.dragStartY;
    const nextOffset = Math.min(Math.max(this.dragStartOffset + delta, 0), 320);
    this.sheetOffsetPx.set(nextOffset);
  }

  onSheetDragEnd(): void {
    const nextExpanded = this.sheetOffsetPx() < 160;
    this.isMobileSheetExpanded.set(nextExpanded);
    this.sheetOffsetPx.set(nextExpanded ? 0 : 220);
    this.dragStartY = 0;
    this.dragStartOffset = 0;
    this.invalidateMapSizeSoon();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.invalidateMapSizeSoon();
  }

  private initializeMap(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      zoomControl: false,
      attributionControl: true
    }).setView([46.4983, 11.3548], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    L.control
      .zoom({
        position: 'bottomright'
      })
      .addTo(this.map);

    this.hotelLayer.addTo(this.map);
    this.selectedHotelLayer.addTo(this.map);
    this.routeLayer.addTo(this.map);
  }

  private loadInitialHotels(): void {
    if (!navigator.geolocation) {
      this.store.loadHotels();
      return;
    }

    this.isLocating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating.set(false);

        if (position.coords.accuracy > 10000) {
          this.store.loadHotels();
          return;
        }

        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.store.setUserLocation(point);
        this.store.loadHotels();
        this.flyTo(point, 12);
        this.startLocationWatch();
      },
      () => {
        this.isLocating.set(false);
        this.store.loadHotels();
      },
      {
        enableHighAccuracy: true,
        timeout: 7000
      }
    );
  }

  private startLocationWatch(): void {
    if (!navigator.geolocation) {
      return;
    }

    this.stopLocationWatch();

    this.geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy > 10000) {
          return;
        }
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.isTrackingLive.set(true);
        this.store.setUserLocation(point);
      },
      () => {
        this.isTrackingLive.set(false);
        // Tracking can fail intermittently; keep last known location.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 12000
      }
    );
  }

  private stopLocationWatch(): void {
    if (this.geolocationWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }
    this.isTrackingLive.set(false);
  }

  private renderHotels(hotels: Accommodation[], selected: Accommodation | null, user: GeoPoint | null): void {
    if (!this.map) return;

    this.hotelLayer.clearLayers();
    this.selectedHotelLayer.clearLayers();
    this.markerByHotelId.clear();

    for (const hotel of hotels) {
      const isSelected = selected?.id === hotel.id;
      const markerSize = isSelected ? 34 : 28;
      const marker = L.marker([hotel.lat, hotel.lng], {
        icon: L.divIcon({
          className: '',
          html: `<span class="hotel-marker${isSelected ? ' selected' : ''}"></span>`,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize]
        })
      })
        .bindTooltip(hotel.name, {
          direction: 'top',
          offset: [0, -10],
          className: 'hotel-tooltip'
        })
        .on('click', () => this.selectHotel(hotel));

      if (isSelected) {
        marker.setZIndexOffset(1200);
        this.selectedHotelLayer.addLayer(marker);
      } else {
        this.hotelLayer.addLayer(marker);
      }

      this.markerByHotelId.set(hotel.id, marker);
    }

    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
    if (this.userAccuracyCircle) {
      this.userAccuracyCircle.remove();
      this.userAccuracyCircle = null;
    }

    if (user) {
      this.userAccuracyCircle = L.circle([user.lat, user.lng], {
        radius: 65,
        color: '#4f9ecf',
        fillColor: '#4f9ecf',
        fillOpacity: 0.08,
        weight: 0.8
      }).addTo(this.map);

      this.userMarker = L.marker([user.lat, user.lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<span class="dot"></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        })
      })
        .addTo(this.map)
        .bindTooltip('You are here', { direction: 'top', offset: [0, -10] });
    }

    const fitSignature = `${hotels.map((hotel) => hotel.id).join('|')}|${user?.lat ?? 'none'}|${user?.lng ?? 'none'}`;
    if (hotels.length > 0 && fitSignature !== this.lastFitSignature) {
      this.fitAll();
      this.lastFitSignature = fitSignature;
    }
  }

  private revealHotelMarker(hotelId: string): void {
    const marker = this.markerByHotelId.get(hotelId);
    if (!marker) {
      return;
    }

    if (this.hotelLayer.hasLayer(marker)) {
      this.hotelLayer.zoomToShowLayer(marker, () => {
        marker.openTooltip();
      });
      return;
    }

    marker.openTooltip();
  }

  private scheduleRenderRoute(user: GeoPoint | null, selected: Accommodation | null, mode: RouteMode): void {
    if (this.routeDebounceTimer) {
      window.clearTimeout(this.routeDebounceTimer);
    }
    this.routeDebounceTimer = window.setTimeout(() => {
      this.renderRoute(user, selected, mode);
    }, 400);
  }

  private renderRoute(user: GeoPoint | null, selected: Accommodation | null, mode: RouteMode): void {
    this.routeLayer.clearLayers();
    this.routeError.set(null);

    if (!this.map || !user || !selected) {
      this.routeLoading.set(false);
      return;
    }

    const requestToken = ++this.routeRequestToken;
    this.routeLoading.set(true);

    void this.fetchStreetRoute(user, selected, mode)
      .then((streetPath) => {
        if (requestToken !== this.routeRequestToken) {
          return;
        }

        L.polyline(streetPath, {
          color: '#2a6f96',
          weight: 7,
          opacity: 0.28,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.routeLayer);

        L.polyline(streetPath, {
          color: '#4f9ecf',
          weight: 4,
          opacity: 0.96,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.routeLayer);

        this.fitToRouteIfPending(streetPath);
      })
      .catch(() => {
        if (requestToken !== this.routeRequestToken) {
          return;
        }

        this.routeError.set('Street route unavailable right now. Showing direct line.');

        L.polyline(
          [
            [user.lat, user.lng],
            [selected.lat, selected.lng]
          ],
          {
            color: '#4f9ecf',
            weight: 3,
            opacity: 0.8,
            dashArray: '8 6'
          }
        ).addTo(this.routeLayer);

        this.fitToRouteIfPending([
          [user.lat, user.lng],
          [selected.lat, selected.lng]
        ]);
      })
      .finally(() => {
        if (requestToken === this.routeRequestToken) {
          this.routeLoading.set(false);
        }
      });
  }

  private async fetchStreetRoute(
    user: GeoPoint,
    selected: Accommodation,
    mode: RouteMode
  ): Promise<L.LatLngExpression[]> {
    const ORS_API_KEY = 'DEIN_API_KEY_HIER';

    const orsProfile =
      mode === 'driving' ? 'driving-car' :
      mode === 'cycling' ? 'cycling-regular' :
      'foot-walking';

    const url = `https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/geo+json',
        'Content-Type': 'application/json',
        'Authorization': ORS_API_KEY
      },
      body: JSON.stringify({
        coordinates: [
          [user.lng, user.lat],
          [selected.lng, selected.lat]
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Routing request failed with ${response.status}`);
    }

    const payload = await response.json();
    const coordinates = payload?.features?.[0]?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error('Routing response missing geometry coordinates');
    }

    return coordinates.map((point: [number, number]) => [point[1], point[0]] as L.LatLngExpression);
  }

  private flyTo(point: GeoPoint, zoom: number): void {
    if (!this.map) return;
    this.map.flyTo([point.lat, point.lng], zoom, { duration: 0.8 });
  }

  private invalidateMapSizeSoon(): void {
    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 0);
  }

  private scrollDetailsIntoView(): void {
    window.setTimeout(() => {
      this.detailsDrawer?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }, 40);
  }

  private buildRouteSummary(selected: Accommodation | null): RouteSummary | null {
    const user = this.store.userLocation();
    if (!selected || !user) {
      return null;
    }

    const km = this.distanceKm(user.lat, user.lng, selected.lat, selected.lng);
    return {
      distanceKm: km,
      driveMinutes: Math.max(3, Math.round((km / 50) * 60)),
      bikeMinutes: Math.max(5, Math.round((km / 18) * 60)),
      walkMinutes: Math.max(8, Math.round((km / 5) * 60))
    };
  }

  private distanceKm(latA: number, lngA: number, latB: number, lngB: number): number {
    const R = 6371;
    const dLat = this.toRadians(latB - latA);
    const dLng = this.toRadians(lngB - lngA);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(latA)) *
        Math.cos(this.toRadians(latB)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private getNextLanguage(current: AppLanguage): AppLanguage {
    if (current === 'en') return 'de';
    if (current === 'de') return 'it';
    return 'en';
  }

  private fitToRouteIfPending(path: L.LatLngExpression[]): void {
    if (!this.map || !this.pendingRouteFit || path.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(path);
    this.map.fitBounds(bounds, {
      padding: [56, 56],
      maxZoom: 16,
      animate: true
    });

    this.pendingRouteFit = false;
  }
}
