import { browser } from '$app/env';
import { writable } from 'svelte/store';

let storedDate;
if (browser) {
  const storedDateString = localStorage.getItem('lastPlayedDate');
  storedDate = new Date(storedDateString);

  const today = new Date();
  var todayString = '' + today.getUTCFullYear() + today.getUTCMonth() + today.getUTCDate();
  var lastPlayedString = '' + storedDate.getUTCFullYear() + storedDate.getUTCMonth() + storedDate.getUTCDate();
  if (todayString != lastPlayedString) {
    console.log('A new day!');
    storedDate = today;
    window.localStorage.setItem('lastPlayedDate', storedDate.toISOString());
    window.localStorage.setItem('inputState', null);
    window.localStorage.setItem('rowState', null);
    window.localStorage.setItem('gameState', "in-progress");
  }
}
 
export const lastPlayedDate = writable(browser ? storedDate : new Date());
lastPlayedDate.subscribe((value) => { if (browser) window.localStorage.setItem('lastPlayedDate', value == null ? null : value.toISOString())});

export const inputState = writable(browser ? JSON.parse(localStorage.getItem('inputState')) ?? [] : []);
inputState.subscribe((value) => { if (browser) localStorage.setItem('inputState', JSON.stringify(value))});

export const rowState = writable(browser ? JSON.parse(localStorage.getItem('rowState')) ?? [] : []);
rowState.subscribe((value) => { if (browser) localStorage.setItem('rowState', JSON.stringify(value))});

export const layoutState = writable(browser ? localStorage.getItem('layout') ?? 'qwerty' : 'qwerty');
layoutState.subscribe((value) => { if (browser) localStorage.setItem('layout', value)});

export const gameState = writable(browser ? localStorage.getItem('gameState') ?? "in-progress" : "in-progress");
gameState.subscribe((value) => { if (browser) localStorage.setItem('gameState', value)});
