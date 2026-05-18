import { toNumber, toLocalizedText, toString } from './accommodation.utils.js';

const ODH_BASE_URL = process.env.ODH_BASE_URL ?? 'https://tourism.api.opendatahub.com/v1';

// ── Data access ──────────────────────────────────────────────────────────────

export async function fetchFromOpenDataHub(language) {
	const url = new URL(`${ODH_BASE_URL}/Accommodation`);
	url.searchParams.set('pagesize', '500');
	url.searchParams.set('language', language);

	const response = await fetch(url, {
		headers: { Accept: 'application/json' },
	});

	if (!response.ok) {
		throw new Error(`Open Data Hub request failed with ${response.status}`);
	}

	const payload = await response.json();
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.Items)) return payload.Items;
	if (Array.isArray(payload?.items)) return payload.items;

	throw new Error('Open Data Hub response shape is unknown');
}

// ── Normalization ────────────────────────────────────────────────────────────

export function normalizeAccommodation(raw, language) {
	if (raw?.Active === false) return null;

	const detail = pickDetail(raw?.AccoDetail, language);
	const lat =
		toNumber(raw?.Latitude) ??
		toNumber(raw?.latitude) ??
		toNumber(raw?.GpsPoints?.position?.Latitude) ??
		toNumber(raw?.GpsInfo?.[0]?.Latitude) ??
		toNumber(raw?.GpsInfo?.Latitude) ??
		toNumber(raw?.gpsInfo?.latitude) ??
		toNumber(raw?.Position?.Latitude);
	const lng =
		toNumber(raw?.Longitude) ??
		toNumber(raw?.longitude) ??
		toNumber(raw?.GpsPoints?.position?.Longitude) ??
		toNumber(raw?.GpsInfo?.[0]?.Longitude) ??
		toNumber(raw?.GpsInfo?.Longitude) ??
		toNumber(raw?.gpsInfo?.longitude) ??
		toNumber(raw?.Position?.Longitude);

	if (lat === null || lng === null) return null;

	const id = String(
		raw?.Id ?? raw?.id ?? raw?.AccoId ?? raw?.AccommodationId ?? `${lat.toFixed(5)}-${lng.toFixed(5)}`
	);
	const name =
		toLocalizedText(detail?.Name) ??
		toLocalizedText(raw?.Name) ??
		toLocalizedText(raw?.Detail?.de?.Title) ??
		toLocalizedText(raw?.Detail?.en?.Title) ??
		toLocalizedText(raw?.name) ??
		null;

	if (!name || name.trim() === '...' || name.trim() === '-') return null;

	const town =
		toLocalizedText(detail?.City) ??
		toLocalizedText(raw?.Municipality?.Name) ??
		toLocalizedText(raw?.Region?.Name) ??
		toLocalizedText(raw?.LocationInfo?.RegionInfo?.Name) ??
		toLocalizedText(raw?.address?.city) ??
		'South Tyrol';
	const address =
		toLocalizedText(detail?.Street) ??
		toLocalizedText(raw?.Address?.Street) ??
		toLocalizedText(raw?.Address?.Address) ??
		toLocalizedText(raw?.address?.streetAddress) ??
		'';
	const typeFromTags = findTagName(raw?.Tags, 'accommodationtypes');
	const typeFromCategory = findTagName(raw?.Tags, 'accommodationcategory');
	const type =
		typeFromTags ??
		toLocalizedText(raw?.AccoTypeId) ??
		toLocalizedText(raw?.AccoType?.Id) ??
		toLocalizedText(raw?.AccoCategory?.Name) ??
		toLocalizedText(raw?.AccommodationType?.Name) ??
		toLocalizedText(raw?.Type) ??
		'Hotel';
	const description =
		toLocalizedText(detail?.Shortdesc) ??
		toLocalizedText(detail?.Longdesc) ??
		toLocalizedText(raw?.Detail?.en?.BaseText) ??
		toLocalizedText(raw?.Detail?.de?.BaseText) ??
		'';
	const phone = toLocalizedText(detail?.Phone) ?? toLocalizedText(raw?.ContactInfos?.PhoneNumber) ?? '';
	const website = toLocalizedText(detail?.Website) ?? toLocalizedText(raw?.ContactInfos?.Url) ?? '';
	const imageUrl =
		toLocalizedText(raw?.ImageGallery?.[0]?.ImageUrl) ?? toLocalizedText(raw?.ImageUrl) ?? '';
	const tags = inferTags(raw, type);

	return {
		id,
		name,
		town,
		address,
		type,
		category: mapTypeToCategory(type, typeFromCategory),
		description,
		phone,
		website,
		imageUrl,
		tags,
		lat,
		lng,
	};
}

// ── Filtering ────────────────────────────────────────────────────────────────

export function applyCategoryFilter(item, category) {
	if (!category || category === 'all') return true;
	return item.category === category;
}

export function applySearchFilter(item, search) {
	if (!search) return true;
	const token = search.trim().toLowerCase();
	if (!token) return true;
	return [item.name, item.town, item.address].some((value) => value.toLowerCase().includes(token));
}

// ── Sorting ──────────────────────────────────────────────────────────────────

export function sortAccommodations(items, sort) {
	const next = [...items];
	if (sort === 'best-rated') {
		next.sort((a, b) => scoreRating(b) - scoreRating(a) || a.distanceKm - b.distanceKm);
		return next;
	}
	if (sort === 'recommended') {
		next.sort((a, b) => scoreRecommended(b) - scoreRecommended(a));
		return next;
	}
	next.sort((a, b) => a.distanceKm - b.distanceKm);
	return next;
}

// ── Deduplication ────────────────────────────────────────────────────────────

export function dedupeAccommodations(items) {
	const byKey = new Map();
	for (const item of items) {
		const latKey = Math.round(item.lat * 10000) / 10000;
		const lngKey = Math.round(item.lng * 10000) / 10000;
		const key = `${item.name.toLowerCase()}|${latKey}|${lngKey}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, item);
			continue;
		}
		if (item.description.length > existing.description.length) {
			byKey.set(key, item);
		}
	}
	return [...byKey.values()];
}

// ── Fallback data ────────────────────────────────────────────────────────────

export function getFallbackAccommodations() {
	return [
		{
			id: 'bolzano-park',
			name: 'Park Hotel Bolzano',
			town: 'Bolzano',
			address: 'Via della Mostra 1',
			type: 'Hotel',
			category: 'hotel',
			description: 'Modern alpine hotel in the center of Bolzano.',
			phone: '+39 000 111 222',
			website: 'https://example.com/park-hotel-bolzano',
			imageUrl: '',
			tags: ['Breakfast', 'Parking'],
			lat: 46.4983,
			lng: 11.3548,
		},
		{
			id: 'merano-vista',
			name: 'Merano Vista B&B',
			town: 'Merano',
			address: 'Passeggiata 12',
			type: 'B&B',
			category: 'bnb',
			description: 'Cozy B&B with mountain views.',
			phone: '+39 000 333 444',
			website: 'https://example.com/merano-vista',
			imageUrl: '',
			tags: ['Breakfast', 'Spa'],
			lat: 46.6696,
			lng: 11.1596,
		},
		{
			id: 'bressanone-loft',
			name: 'Bressanone Alpine Apartments',
			town: 'Bressanone',
			address: 'Via Roma 7',
			type: 'Apartment',
			category: 'apartment',
			description: 'Spacious apartments near the old town.',
			phone: '+39 000 555 666',
			website: 'https://example.com/bressanone-apartments',
			imageUrl: '',
			tags: ['Kitchen', 'Parking'],
			lat: 46.715,
			lng: 11.656,
		},
		{
			id: 'ortisei-spa',
			name: 'Ortisei Mountain Spa Hotel',
			town: 'Ortisei',
			address: 'Strada Rezia 20',
			type: 'Hotel',
			category: 'hotel',
			description: 'Premium spa retreat in Val Gardena.',
			phone: '+39 000 777 888',
			website: 'https://example.com/ortisei-spa',
			imageUrl: '',
			tags: ['Spa', 'Breakfast'],
			lat: 46.5753,
			lng: 11.672,
		},
	];
}

// ── Private helpers ──────────────────────────────────────────────────────────

function pickDetail(accoDetail, language) {
	if (!accoDetail || typeof accoDetail !== 'object') return null;
	if (language === 'de' && accoDetail.de) return accoDetail.de;
	if (language === 'it' && accoDetail.it) return accoDetail.it;
	if (language === 'en' && accoDetail.en) return accoDetail.en;
	if (accoDetail.en) return accoDetail.en;
	if (accoDetail.de) return accoDetail.de;
	if (accoDetail.it) return accoDetail.it;
	const first = Object.values(accoDetail)[0];
	return typeof first === 'object' ? first : null;
}

function findTagName(tags, type) {
	if (!Array.isArray(tags)) return null;
	const match = tags.find((tag) => String(tag?.Type ?? '').toLowerCase() === type);
	return toLocalizedText(match?.Name);
}

function inferTags(raw, type) {
	const tags = new Set();
	const haystack = JSON.stringify(raw).toLowerCase();
	const normalizedType = typeof type === 'string' ? type.toLowerCase() : '';
	if (haystack.includes('spa') || haystack.includes('wellness')) tags.add('Spa');
	if (haystack.includes('park')) tags.add('Parking');
	if (haystack.includes('breakfast')) tags.add('Breakfast');
	if (normalizedType.includes('apartment')) tags.add('Kitchen');
	if (tags.size === 0) tags.add('Local');
	return [...tags].slice(0, 3);
}

function mapTypeToCategory(type, categoryTag = '') {
	const c = typeof categoryTag === 'string' ? categoryTag.toLowerCase() : '';
	if (c.includes('garni') || c.includes('bed') || c.includes('b&b')) return 'bnb';
	if (c.includes('residence') || c.includes('apartment') || c.includes('holiday')) return 'apartment';
	const t = typeof type === 'string' ? type.toLowerCase() : '';
	if (t.includes('bed') || t.includes('b&b')) return 'bnb';
	if (t.includes('apart')) return 'apartment';
	if (t.includes('residence') || t.includes('holiday')) return 'apartment';
	if (t.includes('garni')) return 'bnb';
	return 'hotel';
}

function scoreRating(hotel) {
	let score = 60;
	if (hotel.tags.includes('Spa')) score += 16;
	if (hotel.tags.includes('Breakfast')) score += 12;
	if (hotel.tags.includes('Parking')) score += 8;
	if (hotel.category === 'hotel') score += 4;
	score -= Math.min(hotel.distanceKm, 25) * 0.3;
	return score;
}

function scoreRecommended(hotel) {
	let score = 100 - hotel.distanceKm * 2;
	if (hotel.tags.includes('Spa')) score += 8;
	if (hotel.tags.includes('Parking')) score += 5;
	if (hotel.tags.includes('Breakfast')) score += 4;
	return score;
}
