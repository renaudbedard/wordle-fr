<script context="module">
	/**
	* @param {string} str
	*/
	function xmur3(str) {
			for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
					h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
					h = h << 13 | h >>> 19;
			} return function() {
					h = Math.imul(h ^ (h >>> 16), 2246822507);
					h = Math.imul(h ^ (h >>> 13), 3266489909);
					return (h ^= h >>> 16) >>> 0;
			}
	}

	/**
	* @param {number} a
	*/
	function mulberry32(a) {
			return function() {
				var t = a += 0x6D2B79F5;
				t = Math.imul(t ^ t >>> 15, t | 1);
				t ^= t + Math.imul(t ^ t >>> 7, t | 61);
				return ((t ^ t >>> 14) >>> 0) / 4294967296;
			}
	}

	export async function load({ params, fetch, session, stuff }) {
		const response = await fetch('../mots-francais-5-lettres.json');
		let allWords = await response.json();

		var today = new Date();
		var dateString = '' + today.getUTCFullYear() + today.getUTCMonth() + today.getUTCDate();
		var seed = xmur3(dateString);
		var rand = mulberry32(seed());

		const randomWord = allWords[Math.floor(rand() * allWords.length)];
		return {
			props: {
				allUpperCaseWords: allWords.map(x => x.toUpperCase()),
				randomWord: randomWord
			}
		};
	}
</script>

<script>
	import { each } from 'svelte/internal';
	import { fade } from 'svelte/transition';
	import { rowState, inputState, disabledKeysState, layoutState } from '$lib/gameState';

	export let allUpperCaseWords;
	export let randomWord;

	let rows = [];
	let letterCursor = 0;
	let inputLetters = [];
	let disabledLetters = new Set();
	let combiningBuffer = '';
	let keyRows = [];
	let layoutName = '';

	let inError = false;
	let lastErrorTimer;

	const qwertyLayout = [
		[ 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\u0302', '\u0308' ],
		[ 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '\u0300', '\u0327' ],
		[ '\u23ce', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'É', '\u232b' ]
	];

	const azertyLayout = [
		[ 'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\u0302', '\u0308' ],
		[ 'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'Ù' ],
		[ '\u23ce', 'W', 'X', 'C', 'V', 'B', 'N', 'É', 'È', 'Ç', 'À', '\u232b' ]
	];

	const possibleCombinations = {
		'\u0327': ['C'],
		'\u0302': ['A', 'E', 'I', 'O', 'U'],
		'\u0308': ['E', 'I', 'U'],
		'\u0300': ['A', 'E', 'U']
	};

	const controlKeys = ['\u23ce', '\u232b'];

	rowState.subscribe(value => rows = value);
	inputState.subscribe(value => {
		inputLetters = value;
		letterCursor = inputLetters.indexOf('');
	});

	layoutState.subscribe(value => {
		const currentLayout = value == 'qwerty' ? qwertyLayout : azertyLayout;
		layoutName = value;
		keyRows = currentLayout.map(r => r.map(k => {
			return { glyph: k, class: disabledLetters.has(k.toUpperCase()) ? 'not-in-word' : null };
		}));
	});

	$: layoutState.set(layoutName);

	disabledKeysState.subscribe(value => {
		disabledLetters.clear();
		if (value == null || !(typeof value[Symbol.iterator] === 'function'))
			return;
		for (const letter of value)
			disabledLetters.add(letter);
		keyRows = keyRows.map(r => r.map(k => {
			if (disabledLetters.has(k.glyph.toUpperCase())) {
				k.class = 'not-in-word';
			}
			return k;
		}));
	});	

	/**
	* @param {KeyboardEvent} event
	*/
	function handleKeydown(event) {
		if (event.ctrlKey || event.metaKey) return;
		handleKey(event.key);
	}

	/**
	* @param {MouseEvent} evt
	*/
	function handleClick(evt) {
		if (evt.target instanceof Element) {
			handleKey(evt.target.id.substring(4)); // skip "key_" prefix
		}
	}

	/**
	* @param {string} string
	*/
	function neutralizeAccents(string) {
		return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
	}

	/**
	* @param {string} key
	*/
	function handleKey(key) {
		// DEBUG
		if (key == 'Escape') {
			window.localStorage.clear();
			window.location.reload();
			return;
		}

		// Combinations
		if (Object.keys(possibleCombinations).includes(key)) {
			if (combiningBuffer.length > 0)
				combiningBuffer = '';
			else
				combiningBuffer = key;
			return;
		}

		// Already done!
		if (rows.length == 6 || inputLetters.length == 0) 
			return;

		if ((key == 'Backspace' || key == 'Delete' || key == '\u232b') && letterCursor != 0) {
			if (letterCursor == -1) letterCursor = 4; else letterCursor = letterCursor - 1;
			inputLetters[letterCursor] = '';
			inputState.set(inputLetters);
			return;
		}

		if (letterCursor == -1 && (key == 'Enter' || key == 'NumpadEnter' || key == '\u23ce')) {
			const inputUpperCaseWord = inputLetters.join('').toUpperCase();

			if (!allUpperCaseWords.includes(inputUpperCaseWord)) {
				inError = true;
				if (lastErrorTimer) {
					clearTimeout(lastErrorTimer);
				}
				lastErrorTimer = setTimeout(async () => {
					inError = false;
				}, 1000);
				return;
			}

			const mutatedRow = Array(5);
			const toCheck = [];
			const upperCaseRandomWord = randomWord.toUpperCase();
			const normalizedRandomWord = neutralizeAccents(upperCaseRandomWord);
			const normalizedRandomWordLetters = [...normalizedRandomWord];

			// take care of matches first
			for (let i=0; i<5; i++) {
				const normalizedInputLetter = neutralizeAccents(inputUpperCaseWord[i]);
				const rowLetter = { glyph: inputLetters[i] };
				if (normalizedInputLetter == normalizedRandomWord[i]) {
					rowLetter.class = 'in-place';
					rowLetter.glyph = randomWord[i];
					normalizedRandomWordLetters[i] = '\0';
					mutatedRow[i] = rowLetter;
				} else {
					toCheck.push(i);
				}
			}

			// then the rest
			for (const i of toCheck) {
				const normalizedInputLetter = neutralizeAccents(inputUpperCaseWord[i]);
				const rowLetter = { glyph: inputLetters[i] };
				if (normalizedRandomWordLetters.includes(normalizedInputLetter)) {
					rowLetter.class = 'in-word';
					if (!upperCaseRandomWord.includes(inputUpperCaseWord[i])) {
						disabledLetters.add(inputUpperCaseWord[i]);
					} else if (!upperCaseRandomWord.includes(normalizedInputLetter[i])) {
						disabledLetters.add(normalizedInputLetter[i]);
					}					
					for (let i = 0; i < 5; i++) {
						if (normalizedRandomWordLetters[i] == normalizedInputLetter) {
							rowLetter.glyph = randomWord[i];
							normalizedRandomWordLetters[i] = '\0';
							break;
						}
					}
				} else {
					if (!upperCaseRandomWord.includes(inputUpperCaseWord[i])) {
						disabledLetters.add(inputUpperCaseWord[i]);
					} else if (!upperCaseRandomWord.includes(normalizedInputLetter[i])) {
						disabledLetters.add(normalizedInputLetter[i]);
					}
					rowLetter.class = 'not-in-word';
				}
				mutatedRow[i] = rowLetter;
			}

			rows = [...rows, mutatedRow];

			if (toCheck.length > 0 && rows.length < 6) 
				inputLetters = Array(5).fill('');
			else
				inputLetters = [];

			disabledKeysState.set([...disabledLetters]);
			rowState.set(rows);
			inputState.set(inputLetters);
			return;
		}

		if (letterCursor == -1 || !RegExp(/^\p{L}{1}$/, 'u').test(key)) 
			return;

		if (combiningBuffer.length > 0) {
			key = `${key}${combiningBuffer}`.normalize();
			combiningBuffer = '';
		}

		inputLetters[letterCursor] = key;
		inputState.set(inputLetters);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<header>
	<h1>MOTDLE</h1>
</header>

<game-board>
	<rows>
		{#each rows as row}
			<row>
				{#each row as letter}
					<letter-box class={letter.class}>
						<letter>{letter.glyph}</letter>
					</letter-box>
				{/each}
			</row>
		{/each}

		<row>
			{#each inputLetters as letter}
				<letter-box>
					<letter>{letter}</letter>
				</letter-box>
			{/each}
		</row>
	</rows>

	{#if inError}
		<error-box out:fade>Ce mot n'est pas reconnu!</error-box>
	{/if}
</game-board>

<keyboard>
	<row>
		<label><input bind:group={layoutName} type='radio' value='qwerty' /> 🇨🇦</label>
		<label><input bind:group={layoutName} type='radio' value='azerty' /> 🇫🇷</label>
	</row>
	{#each keyRows as row}
		<row>
			{#each row as key}
				<button disabled={key.class == 'not-in-word' || (combiningBuffer.length > 0 && !possibleCombinations[combiningBuffer].includes(key.glyph) && !controlKeys.includes(key.glyph) && key.glyph != combiningBuffer)} class="{key.class}" id="key_{key.glyph}" on:click={handleClick}>{key.glyph}</button>
			{/each}
		</row>
	{/each}
</keyboard>	

<style>
	:root {
		background-color: black;
		color: white;
		font-family: sans-serif;
	}

	header,
	game-board,
	keyboard {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1ch;
	}

	keyboard {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		margin-bottom: 1em;
	}

	keyboard row {
		display: flex;
		gap: min(0.5vw, 0.5ch);
	}

	button {
		display: grid;
		justify-items: center;
		align-items: center;
		background-color: #333333;
		height: min(9vw, 4ch);
		font-size: min(4vw, 2.5ch);
		border-radius: 2px;
		padding: min(2vw, 0.75ch);
		min-width: min(6vw, 3ch);
		border: 1px solid #666666;
		text-transform: capitalize;
		transition-duration: 0.05s;
		color: white;
		touch-action: manipulation;
	}

	button:hover {
		background-color: #555555; 
		color: white;
	}

	button:active {
		background-color: #000000;
		color: #bbbbbb;
	}	

	game-board rows {
		display: grid;
		gap: 5px;
	}

	game-board row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 5px;
	}

	letter-box {
		display: grid;
		justify-items: center;
		align-items: center;
		background-color: #333333;
		width: min(15vw, 7ch);
		height: min(15vw, 7ch);
	}

	letter {
		font-size: 2em;
		font-weight: bold;
		text-transform: capitalize;
	}

	.in-place {
		background-color: green;
	}

	.in-word {
		background-color: #cccc00;
		color: #333333;
	}

	.not-in-word, button.not-in-word:hover, button:disabled {
		background-color: #111111;
		color: #333333;
	}
</style>
