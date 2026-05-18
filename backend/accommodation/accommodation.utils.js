// Pure utility functions shared across model and controller layers

export function normalizeLanguage(value) {
	if (!value) return 'en';
	const v = value.toLowerCase();
	if (v === 'en' || v === 'de' || v === 'it') return v;
	return 'en';
}

export function normalizeCategory(value) {
	if (!value) return 'all';
	const v = value.toLowerCase();
	if (v === 'hotel' || v === 'bnb' || v === 'apartment' || v === 'all') return v;
	return 'all';
}

export function normalizeSort(value) {
	if (!value) return 'nearest';
	const v = value.toLowerCase();
	if (v === 'nearest' || v === 'best-rated' || v === 'recommended') return v;
	return 'nearest';
}

export function toLocalizedText(value) {
	if (!value) return null;
	if (typeof value === 'string') return value;
	if (typeof value === 'object') {
		return value.en ?? value.de ?? value.it ?? Object.values(value)[0] ?? null;
	}
	return null;
}

export function toString(value) {
	if (typeof value !== 'string') return '';
	return value;
}

export function toNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export function clamp(value, min, max) {
	if (value === null) return null;
	return Math.min(Math.max(value, min), max);
}

export function distanceKm(latA, lngA, latB, lngB) {
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
