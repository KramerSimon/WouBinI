import {
	fetchFromOpenDataHub,
	normalizeAccommodation,
	dedupeAccommodations,
	applyCategoryFilter,
	applySearchFilter,
	sortAccommodations,
	getFallbackAccommodations,
} from './accommodation.model.js';
import { distanceKm, toNumber, clamp, normalizeLanguage, normalizeCategory, normalizeSort, toString } from './accommodation.utils.js';

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 20;

export async function listAction(req, res) {
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

		const sorted = sortAccommodations(normalized, sort);
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
		const fallback = getFallbackAccommodations()
			.map((item) => ({ ...item, distanceKm: distanceKm(lat, lng, item.lat, item.lng) }))
			.filter((item) => item.distanceKm <= radiusKm)
			.filter((item) => applyCategoryFilter(item, category))
			.filter((item) => applySearchFilter(item, search));

		const sorted = sortAccommodations(fallback, sort);
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
