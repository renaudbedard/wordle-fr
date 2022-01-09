import { browser } from '$app/env';
import { writable } from 'svelte/store';
 
//export const lastPlayedDate = writable(browser ? new Date(localStorage.getItem('lastPlayedDate')) ?? new Date() : new Date());
//lastPlayedDate.subscribe((value) => { if (browser) window.localStorage.setItem('lastPlayedDate', value.toISOString())});

export const inputState = writable(browser ? JSON.parse(localStorage.getItem('inputState')) ?? Array(5).fill('') : Array(5).fill(''));
inputState.subscribe((value) => { if (browser) localStorage.setItem('inputState', JSON.stringify(value))});

export const rowState = writable(browser ? JSON.parse(localStorage.getItem('rowState')) ?? [] : []);
rowState.subscribe((value) => { if (browser) localStorage.setItem('rowState', JSON.stringify(value))});