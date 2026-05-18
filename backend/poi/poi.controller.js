import {
	fetchPoisFromOpenDataHub,
	normalizePoi,
	dedupePois,
	applyPoiSearchFilter,
	sortPois,
	getFallbackPois,
} from './poi.model.js';
import { distanceKm, toNumber, clamp, normalizeLanguage, toString } from '../accommodation/accommodation.utils.js';

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 20;

function normalizePoiSort(value) {
	if (!value) return 'nearest';
	const v = value.toLowerCase();
	if (v === 'nearest' || v === 'summer' || v === 'winter' || v === 'year-round') return v;
	return 'nearest';
}

export async function listPoisAction(req, res) {
	const lat = toNumber(req.query.lat);
	const lng = toNumber(req.query.lng);
	const radiusKm = clamp(toNumber(req.query.radiusKm), 1, 50) ?? DEFAULT_RADIUS_KM;
	const language = normalizeLanguage(toString(req.query.lang));
	const search = toString(req.query.search);
	const sort = normalizePoiSort(toString(req.query.sort));
	const limit = clamp(toNumber(req.query.limit), 1, 50) ?? DEFAULT_LIMIT;

	if (lat === null || lng === null) {
		res.status(400).json({ error: 'lat and lng are required query params' });
		return;
	}

	try {
		const pois = await fetchPoisFromOpenDataHub(language);
		const normalized = dedupePois(
			pois
				.map((item) => normalizePoi(item, language))
				.filter((item) => item !== null)
				.map((item) => ({ ...item, distanceKm: distanceKm(lat, lng, item.lat, item.lng) }))
				.filter((item) => item.distanceKm <= radiusKm)
				.filter((item) => applyPoiSearchFilter(item, search))
		);

		const sorted = sortPois(normalized, sort);
		const paged = sorted.slice(0, limit);

		res.json({
			source: 'opendatahub',
			language,
			center: { lat, lng },
			radiusKm,
			total: sorted.length,
			items: paged,
		});
	} catch (error) {
		const fallback = getFallbackPois()
			.map((item) => ({ ...item, distanceKm: distanceKm(lat, lng, item.lat, item.lng) }))
			.filter((item) => item.distanceKm <= radiusKm)
			.filter((item) => applyPoiSearchFilter(item, search));

		const sorted = sortPois(fallback, sort);
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
				message: error instanceof Error ? error.message : 'Unknown Open Data Hub error',
			},
		});
	}
}
