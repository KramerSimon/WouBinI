import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const ODH_BASE_URL = process.env.ODH_BASE_URL ?? 'https://tourism.api.opendatahub.com/v1';
const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 20;

app.use(cors());

app.get('/api/health', (_req, res) => {
	res.json({ ok: true, service: 'woubini-backend' });
});

app.get('/api/accommodations', async (req, res) => {
	const lat = toNumber(req.query.lat);
	const lng = toNumber(req.query.lng);
	const radiusKm = clamp(toNumber(req.query.radiusKm), 1, 50) ?? DEFAULT_RADIUS_KM;
	const language = normalizeLanguage(toString(req.query.lang));
	const search = toString(req.query.search);
	const category = normalizeCategory(toString(req.query.category));
	const sort = normalizeSort(toString(req.query.sort));
	const limit = clamp(toNumber(req.query.limit), 1, 50) ?? DEFAULT_LIMIT;

	if (lat === null || lng === null) {
		res.status(400).json({ error: 'lat and lng are required query params' });
		return;
	}

	try {
		const hotels = await fetchFromOpenDataHub(language);
		const normalized = dedupeAccommodations(
			hotels
			.map((item) => normalizeAccommodation(item, language))
			.filter((item) => item !== null)
			.map((item) => ({ ...item, distanceKm: distanceKm(lat, lng, item.lat, item.lng) }))
			.filter((item) => item.distanceKm <= radiusKm)
			.filter((item) => applyCategoryFilter(item, category))
			.filter((item) => applySearchFilter(item, search))
		);

		const sorted = sortHotels(normalized, sort);
		const paged = sorted.slice(0, limit);

		res.json({
			source: 'opendatahub',
			language,
			center: { lat, lng },
			radiusKm,
			total: sorted.length,
			items: paged
		});
	} catch (error) {
		const fallback = getFallbackHotels()
			.map((item) => ({ ...item, distanceKm: distanceKm(lat, lng, item.lat, item.lng) }))
			.filter((item) => item.distanceKm <= radiusKm)
			.filter((item) => applyCategoryFilter(item, category))
			.filter((item) => applySearchFilter(item, search));

		const sorted = sortHotels(fallback, sort);
		const paged = sorted.slice(0, limit);

		res.json({
			source: 'fallback',
			language,
			center: { lat, lng },
			radiusKm,
			total: sorted.length,
			warning: 'Open Data Hub unavailable, served fallback data',
			items: paged,
			debug: {
				message: error instanceof Error ? error.message : 'Unknown Open Data Hub error'
			}
		});
	}
});

app.listen(PORT, () => {
	console.log(`Backend listening on http://localhost:${PORT}`);
});

async function fetchFromOpenDataHub(language) {
	const url = new URL(`${ODH_BASE_URL}/Accommodation`);
	url.searchParams.set('pagesize', '500');
	url.searchParams.set('language', language);

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Open Data Hub request failed with ${response.status}`);
	}

	const payload = await response.json();
	if (Array.isArray(payload)) {
		return payload;
	}

	if (Array.isArray(payload?.Items)) {
		return payload.Items;
	}

	if (Array.isArray(payload?.items)) {
		return payload.items;
	}

	throw new Error('Open Data Hub response shape is unknown');
}

function normalizeAccommodation(raw, language) {
	if (raw?.Active === false) {
		return null;
	}

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

	if (lat === null || lng === null) {
		return null;
	}

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

	if (!name || name.trim() === '...' || name.trim() === '-') {
		return null;
	}

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
		lng
	};
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

function pickDetail(accoDetail, language) {
	if (!accoDetail || typeof accoDetail !== 'object') {
		return null;
	}

	if (language === 'de' && accoDetail.de) return accoDetail.de;
	if (language === 'it' && accoDetail.it) return accoDetail.it;
	if (language === 'en' && accoDetail.en) return accoDetail.en;

	if (accoDetail.en) return accoDetail.en;
	if (accoDetail.de) return accoDetail.de;
	if (accoDetail.it) return accoDetail.it;

	const first = Object.values(accoDetail)[0];
	return typeof first === 'object' ? first : null;
}

function normalizeLanguage(value) {
	if (!value) return 'en';
	const v = value.toLowerCase();
	if (v === 'en' || v === 'de' || v === 'it') return v;
	return 'en';
}

function findTagName(tags, type) {
	if (!Array.isArray(tags)) return null;
	const match = tags.find((tag) => String(tag?.Type ?? '').toLowerCase() === type);
	return toLocalizedText(match?.Name);
}

function dedupeAccommodations(items) {
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

function applyCategoryFilter(item, category) {
	if (!category || category === 'all') return true;
	return item.category === category;
}

function applySearchFilter(item, search) {
	if (!search) return true;
	const token = search.trim().toLowerCase();
	if (!token) return true;
	return [item.name, item.town, item.address].some((value) => value.toLowerCase().includes(token));
}

function sortHotels(items, sort) {
	const next = [...items];
	if (sort === 'best-rated') {
		next.sort((a, b) => scoreRating(b) - scoreRating(a) || a.distanceKm - b.distanceKm);
		return next;
	}
	if (sort === 'recommended') {
		next.sort((a, b) => scoreHotel(b) - scoreHotel(a));
		return next;
	}
	next.sort((a, b) => a.distanceKm - b.distanceKm);
	return next;
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

function scoreHotel(hotel) {
	let score = 100 - hotel.distanceKm * 2;
	if (hotel.tags.includes('Spa')) score += 8;
	if (hotel.tags.includes('Parking')) score += 5;
	if (hotel.tags.includes('Breakfast')) score += 4;
	return score;
}

function normalizeCategory(value) {
	if (!value) return 'all';
	const v = value.toLowerCase();
	if (v === 'hotel' || v === 'bnb' || v === 'apartment' || v === 'all') return v;
	return 'all';
}

function normalizeSort(value) {
	if (!value) return 'nearest';
	const v = value.toLowerCase();
	if (v === 'nearest' || v === 'best-rated' || v === 'recommended') return v;
	return 'nearest';
}

function toLocalizedText(value) {
	if (!value) return null;
	if (typeof value === 'string') return value;
	if (typeof value === 'object') {
		return value.en ?? value.de ?? value.it ?? Object.values(value)[0] ?? null;
	}
	return null;
}

function toString(value) {
	if (typeof value !== 'string') return '';
	return value;
}

function toNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function clamp(value, min, max) {
	if (value === null) return null;
	return Math.min(Math.max(value, min), max);
}

function distanceKm(latA, lngA, latB, lngB) {
	const R = 6371;
	const dLat = toRadians(latB - latA);
	const dLng = toRadians(lngB - lngA);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRadians(value) {
	return (value * Math.PI) / 180;
}

function getFallbackHotels() {
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
			lng: 11.3548
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
			lng: 11.1596
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
			lat: 46.7150,
			lng: 11.6560
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
			lng: 11.6720
		}
	];
}
