const epochDate = [2022, 0, 20];
const refreshHourUTC = 23;

export const epoch = Date.UTC(epochDate[0], epochDate[1], epochDate[2], refreshHourUTC, 0, 0, 0);

export function getNextRefreshDate() {
	return epoch + (getDayNumber() + 1) * 24 * 60 * 60 * 1000;
}

export function getDayNumber() {
	const today = new Date();
	const millisSinceEpoch =
		Date.UTC(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate(),
			today.getUTCHours(),
			today.getUTCMinutes(),
			today.getUTCMinutes(),
			today.getUTCMilliseconds()
		) - epoch;
	return Math.floor(millisSinceEpoch / 1000 / 60 / 60 / 24);
}
