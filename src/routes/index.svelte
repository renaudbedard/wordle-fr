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
	import { rowState, inputState } from '$lib/gameState';

	export let allUpperCaseWords;
	export let randomWord;

	let rows = [];
	let letterCursor = 0;
	let inputLetters = [];

	rowState.subscribe(value => rows = value);
	inputState.subscribe(value => {
		inputLetters = value;
		letterCursor = inputLetters.indexOf('');
	});

	let inError = false;
	let lastErrorTimer;

	let glyphRows = [
		[ 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '^', '¨' ],
		[ 'A', 'S', 'D', 'F', 'G',' H', 'J', 'K', 'L', '`' ],
		[ 'Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'É', 'Backspace' ]
	];

	let keyRows = glyphRows.map(r => r.map(k => {
		return { glyph: k, class: null };
	}));

	/**
	* @param {KeyboardEvent} event
	*/
	function handleKeydown(event) {
		if (event.ctrlKey) return;
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

		if ((key == 'Backspace' || key == 'Delete') && letterCursor != 0) {
			if (letterCursor == -1) letterCursor = 4; else letterCursor = letterCursor - 1;
			inputLetters[letterCursor] = '';
			inputState.update(_ => inputLetters);
			return;
		}

		if (letterCursor == -1 && (key == 'Enter' || key == 'NumpadEnter')) {
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
			const normalizedRandomWord = neutralizeAccents(randomWord.toUpperCase());
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
					for (let i = 0; i < 5; i++) {
						if (normalizedRandomWordLetters[i] == normalizedInputLetter) {
							rowLetter.glyph = randomWord[i];
							normalizedRandomWordLetters[i] = '\0';
							break;
						}
					}
				} else {
					rowLetter.class = 'not-in-word';
				}
				mutatedRow[i] = rowLetter;
			}

			keyRows = keyRows.map(r => r.map(k => {
					if (inputUpperCaseWord.includes(k.glyph) && !randomWord.toUpperCase().includes(k.glyph)) {
						k.class = 'not-in-word';
					}
					return k;
				}));

			rows = [...rows, mutatedRow];

			if (toCheck.length > 0) 
				inputLetters = ['', '', '', '', ''];
			else
				inputLetters = [];

			rowState.update(_ => rows);
			inputState.update(_ => inputLetters);
			return;
		}

		if (letterCursor == -1 || !RegExp(/^\p{L}{1}$/, 'u').test(key)) return;

		inputLetters[letterCursor] = key;
		inputState.update(_ => inputLetters);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<header>
	<h1>MOTDLE 🇫🇷</h1>
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
		<error-box out:fade> Ce mot n'est pas reconnu!</error-box>
	{/if}
</game-board>

<keyboard>
	{#each keyRows as row}
		<row>
			{#each row as key}
				<button class={key.class} id="key_{key.glyph}" on:click={handleClick}>{key.glyph}</button>
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
		gap: 5px;
	}

	button {
		display: grid;
		justify-items: center;
		align-items: center;
		background-color: #333333;
		/* width: 3ch; */
		height: 5ch;
		font-size: 1em;
		text-transform: capitalize;
		color: white;
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
		width: 7ch;
		height: 7ch;
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

	.not-in-word {
		background-color: #111111;
		color: #333333;
	}
</style>
