import { browser } from '$app/env';
import { writable } from 'svelte/store';

let storedDate;
if (browser) {
  const lastPlayedDay = parseInt(localStorage.getItem('lastPlayedDay'));

  const today = new Date();
  const epoch = Date.UTC(2022, 0, 25, 0, 0, 0, 0);
  const millisSinceEpoch = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0) - epoch;
  const daysSinceEpoch = Math.floor(millisSinceEpoch / 1000 / 60 / 60 / 24);
  
  if (lastPlayedDay != daysSinceEpoch) {
    console.log(`Now playing day ${daysSinceEpoch}`);
    storedDate = today;
    window.localStorage.setItem('lastPlayedDay', '' + daysSinceEpoch);
    window.localStorage.setItem('inputState', null);
    window.localStorage.setItem('rowState', null);
    window.localStorage.setItem('progressState', "playing");
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

export const progressState = writable(browser ? localStorage.getItem('progressState') ?? "playing" : "playing");
progressState.subscribe((value) => { if (browser) localStorage.setItem('progressState', value)});

const defaultScoreHistory = {
  "streak": 0,
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
  "6": 0,
  "X": 0,
};
export const scoreHistoryState = writable(browser ? JSON.parse(localStorage.getItem('scoreHistory')) ?? defaultScoreHistory : defaultScoreHistory);
scoreHistoryState.subscribe((value) => { if (browser) localStorage.setItem('scoreHistory', JSON.stringify(value))});
