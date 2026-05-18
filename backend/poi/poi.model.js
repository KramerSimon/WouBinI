import { toNumber, toLocalizedText } from '../accommodation/accommodation.utils.js';

const ODH_BASE_URL = process.env.ODH_BASE_URL ?? 'https://tourism.api.opendatahub.com/v1';

// ── Data access ──────────────────────────────────────────────────────────────

export async function fetchPoisFromOpenDataHub(language) {
	const url = new URL(`${ODH_BASE_URL}/ODHActivityPoi`);
	url.searchParams.set('source', 'idm');
	url.searchParams.set('pagesize', '500');
	url.searchParams.set('language', language);
	url.searchParams.set('active', 'true');

	const response = await fetch(url, {
		headers: { Accept: 'application/json' },
	});

	if (!response.ok) {
		throw new Error(`Open Data Hub POI request failed with ${response.status}`);
	}

	const payload = await response.json();
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.Items)) return payload.Items;
	if (Array.isArray(payload?.items)) return payload.items;

	throw new Error('Open Data Hub POI response shape is unknown');
}

// ── Normalization ────────────────────────────────────────────────────────────

export function normalizePoi(raw, language) {
	if (raw?.Active === false && raw?.OdhActive === false) return null;

	const detail = pickDetail(raw?.Detail, language);
	const contact = pickDetail(raw?.ContactInfos, language);
	const additionalInfo = pickDetail(raw?.AdditionalPoiInfos, language);

	const lat =
		toNumber(raw?.GpsInfo?.[0]?.Latitude) ??
		toNumber(raw?.GpsPoints?.position?.Latitude) ??
		toNumber(raw?.Latitude) ??
		null;
	const lng =
		toNumber(raw?.GpsInfo?.[0]?.Longitude) ??
		toNumber(raw?.GpsPoints?.position?.Longitude) ??
		toNumber(raw?.Longitude) ??
		null;

	if (lat === null || lng === null) return null;

	const id = String(raw?.Id ?? `${lat.toFixed(5)}-${lng.toFixed(5)}`);

	const name =
		toLocalizedText(detail?.Title) ??
		toLocalizedText(raw?.Shortname) ??
		null;

	if (!name || name.trim() === '' || name.trim() === '-') return null;

	const town =
		toLocalizedText(raw?.LocationInfo?.MunicipalityInfo?.Name) ??
		toLocalizedText(raw?.LocationInfo?.DistrictInfo?.Name) ??
		toLocalizedText(contact?.City) ??
		'South Tyrol';

	const address = toLocalizedText(contact?.Address) ?? '';
	const description =
		toLocalizedText(detail?.BaseText) ??
		toLocalizedText(detail?.IntroText) ??
		toLocalizedText(detail?.Header) ??
		'';
	const phone = toLocalizedText(contact?.Phonenumber) ?? '';
	const website = toLocalizedText(contact?.Url) ?? '';
	const imageUrl = toLocalizedText(raw?.ImageGallery?.[0]?.ImageUrl) ?? '';
	const type =
		toLocalizedText(additionalInfo?.MainType) ??
		toLocalizedText(raw?.Type) ??
		'Attraction';
	const season = inferSeason(raw);
	const tags = inferPoiTags(raw, additionalInfo, season);

	return {
		id,
		name,
		town,
		address,
		type,
		season,
		category: 'attraction',
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

export function applyPoiSearchFilter(item, search) {
	if (!search) return true;
	const token = search.trim().toLowerCase();
	if (!token) return true;
	return [item.name, item.town, item.address, item.type].some((value) =>
		value.toLowerCase().includes(token)
	);
}

// ── Sorting ──────────────────────────────────────────────────────────────────

export function sortPois(items, sort) {
	const next = [...items];
	if (sort === 'summer') {
		return next
			.filter((item) => item.season === 'summer')
			.sort((a, b) => a.distanceKm - b.distanceKm);
	}
	if (sort === 'winter') {
		return next
			.filter((item) => item.season === 'winter')
			.sort((a, b) => a.distanceKm - b.distanceKm);
	}
	if (sort === 'year-round') {
		return next
			.filter((item) => item.season === 'year-round')
			.sort((a, b) => a.distanceKm - b.distanceKm);
	}
	// nearest – show all, sorted by distance
	next.sort((a, b) => a.distanceKm - b.distanceKm);
	return next;
}

// ── Deduplication ────────────────────────────────────────────────────────────

export function dedupePois(items) {
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

export function getFallbackPois() {
	return [
		{
			id: 'bolzano-duomo',
			name: 'Bolzano Cathedral',
			town: 'Bolzano',
			address: 'Piazza Walther 1',
			type: 'Culture',
			season: 'year-round',
			category: 'attraction',
			description: 'The Gothic cathedral in the heart of Bolzano.',
			phone: '',
			website: 'https://www.bolzano.net',
			imageUrl: '',
			tags: ['Culture', 'History'],
			lat: 46.4981,
			lng: 11.3537,
		},
		{
			id: 'merano-thermal',
			name: 'Merano Thermal Baths',
			town: 'Merano',
			address: 'Piazza Terme 9',
			type: 'Wellness',
			season: 'year-round',
			category: 'attraction',
			description: 'Modern thermal baths in the heart of Merano.',
			phone: '+39 0473 252 000',
			website: 'https://www.termemerano.it',
			imageUrl: '',
			tags: ['Wellness', 'Spa'],
			lat: 46.6710,
			lng: 11.1574,
		},
		{
			id: 'castel-roncolo',
			name: 'Castel Roncolo',
			town: 'Bolzano',
			address: 'Via San Antonio 15',
			type: 'Culture',
			season: 'year-round',
			category: 'attraction',
			description: 'Medieval castle with famous courtly frescoes.',
			phone: '+39 0471 329 808',
			website: 'https://www.runkelstein.info',
			imageUrl: '',
			tags: ['History', 'Culture'],
			lat: 46.5183,
			lng: 11.3364,
		},
	];
}

// ── Private helpers ──────────────────────────────────────────────────────────

function pickDetail(obj, language) {
	if (!obj || typeof obj !== 'object') return null;
	if (language === 'de' && obj.de) return obj.de;
	if (language === 'it' && obj.it) return obj.it;
	if (language === 'en' && obj.en) return obj.en;
	if (obj.en) return obj.en;
	if (obj.de) return obj.de;
	if (obj.it) return obj.it;
	const first = Object.values(obj)[0];
	return typeof first === 'object' ? first : null;
}

function inferSeason(raw) {
	const type = (raw?.Type ?? '').toLowerCase();
	const tags = (raw?.Tags ?? []).map((t) => (t?.Id ?? '').toLowerCase());
	const smgTags = (raw?.SmgTags ?? []).map((t) => t.toLowerCase());
	const all = [type, ...tags, ...smgTags];

	const isSummer = all.some((v) => v === 'sommer' || v === 'summer');
	const isWinter = all.some((v) => v === 'winter');

	if (isSummer && isWinter) return 'year-round';
	if (isSummer) return 'summer';
	if (isWinter) return 'winter';
	return 'year-round';
}

function inferPoiTags(raw, additionalInfo, season) {
	const tags = new Set();

	if (season === 'summer') tags.add('Summer');
	if (season === 'winter') tags.add('Winter');
	if (season === 'year-round') tags.add('Year-round');

	const mainType = (additionalInfo?.MainType ?? '').toLowerCase();
	if (mainType.includes('culture') || mainType.includes('attraction')) tags.add('Culture');
	if (mainType.includes('eating') || mainType.includes('drinking')) tags.add('Gastronomy');
	if (mainType.includes('shops') || mainType.includes('service')) tags.add('Shopping');

	return [...tags].slice(0, 3);
}

function scorePoiRating(poi) {
	let score = 60;
	if (poi.tags.includes('Culture')) score += 12;
	if (poi.tags.includes('Wellness')) score += 10;
	if (poi.imageUrl) score += 8;
	score -= Math.min(poi.distanceKm, 25) * 0.3;
	return score;
}

function scorePoiRecommended(poi) {
	let score = 100 - poi.distanceKm * 2;
	if (poi.imageUrl) score += 6;
	if (poi.description.length > 50) score += 4;
	return score;
}
