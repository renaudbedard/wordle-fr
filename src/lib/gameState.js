import { browser } from '$app/env';
import { writable } from 'svelte/store';
import { getDayNumber } from '$lib/time';

if (browser) {
	const lastPlayedDay = parseInt(localStorage.getItem('lastPlayedDay'));
	const currentDay = getDayNumber();

	if (lastPlayedDay != currentDay) {
		console.log(`Now playing day ${currentDay}`);
		window.localStorage.setItem('lastPlayedDay', '' + currentDay);
		window.localStorage.setItem('inputState', null);
		window.localStorage.setItem('rowState', null);
		window.localStorage.setItem('progressState', 'playing');
	}
}

export const inputState = writable(
	browser ? JSON.parse(localStorage.getItem('inputState')) ?? [] : []
);
inputState.subscribe((value) => {
	if (browser) localStorage.setItem('inputState', JSON.stringify(value));
});

export const rowState = writable(browser ? JSON.parse(localStorage.getItem('rowState')) ?? [] : []);
rowState.subscribe((value) => {
	if (browser) localStorage.setItem('rowState', JSON.stringify(value));
});

export const layoutState = writable(
	browser ? localStorage.getItem('layout') ?? 'qwerty' : 'qwerty'
);
layoutState.subscribe((value) => {
	if (browser) localStorage.setItem('layout', value);
});

export const progressState = writable(
	browser ? localStorage.getItem('progressState') ?? 'playing' : 'playing'
);
progressState.subscribe((value) => {
	if (browser) localStorage.setItem('progressState', value);
});

const defaultScoreHistory = {
	streak: 0,
	1: 0,
	2: 0,
	3: 0,
	4: 0,
	5: 0,
	6: 0,
	X: 0
};
export const scoreHistoryState = writable(
	browser
		? JSON.parse(localStorage.getItem('scoreHistory')) ?? defaultScoreHistory
		: defaultScoreHistory
);
scoreHistoryState.subscribe((value) => {
	if (browser) localStorage.setItem('scoreHistory', JSON.stringify(value));
});
