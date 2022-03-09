<script context="module">
	/**
	 * @param {string} str
	 */
	function xmur3(str) {
		for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
			h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
			h = (h << 13) | (h >>> 19);
		}
		return function () {
			h = Math.imul(h ^ (h >>> 16), 2246822507);
			h = Math.imul(h ^ (h >>> 13), 3266489909);
			return (h ^= h >>> 16) >>> 0;
		};
	}

	/**
	 * @param {number} a
	 */
	function mulberry32(a) {
		return function () {
			let t = (a += 0x6d2b79f5);
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * via : https://stackoverflow.com/a/12646864
	 * @param {any[]} array
	 * @param {() => number} randFunction
	 */
	function shuffleArray(array, randFunction) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(randFunction() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		// Force HTTPS redirect (doesn't work for iOS Safari, no point in keeping it)
		/*
		console.log(`Protocol=${url.protocol}, hostname=${url.hostname}`);
		if (url.hostname != 'localhost' && url.protocol == 'http:') {
			const redirectURI = `https://${url.host}${url.pathname}`;
			console.log(`Redirecting to ${redirectURI}`);
			return {
				status: 302,
				redirect: redirectURI
			};
		}
		*/

		let response = await fetch('../input-whitelist.json');
		let allWords = await response.json();

		response = await fetch('../random-word-list.json');
		let randomPool = await response.json();

		const today = new Date();
		const epoch = Date.UTC(2022, 0, 26, 0, 0, 0, 0);
		const millisSinceEpoch =
			Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0) - epoch;
		const daysSinceEpoch = Math.floor(millisSinceEpoch / 1000 / 60 / 60 / 24);
		const seed = xmur3('The saltiest of hashes');
		const rand = mulberry32(seed());
		shuffleArray(randomPool, rand);

		const randomWord = randomPool[daysSinceEpoch % randomPool.length];
		return {
			props: {
				allWords: allWords.map((x) => x.toUpperCase()),
				randomWord: randomWord.toUpperCase()
			}
		};
	}
</script>

<script>
	import { fade } from 'svelte/transition';
	import { fly } from 'svelte/transition';
	import { dev } from '$app/env';
	import {
		rowState,
		inputState,
		layoutState,
		progressState,
		scoreHistoryState
	} from '$lib/gameState';
	import Switch from './Switch.svelte';

	export let allWords;
	export let randomWord;

	const arrayOf5 = new Array(5);
	const arrayOf6 = new Array(6);
	let rows = [];
	let inputLetters = [];
	let combiningBuffer = '';
	let keyRows = [];
	let azertyLayout = false;

	let inError = false;
	let lastErrorTimer;

	let comment = null;
	let lastCommentTimer;

	const todayDate = new Date();
	const tomorrow = Date.UTC(
		todayDate.getUTCFullYear(),
		todayDate.getUTCMonth(),
		todayDate.getUTCDate() + 1,
		0,
		0,
		0,
		0
	);
	let timeLeft;
	let progress;
	let showSettings = false;
	let showHelp = false;
	let resultsHidden = false;

	let shareButtonText = '📋 Partager';

	const layouts = {
		qwerty: [
			['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\u232b'],
			['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '\u0300', '\u23ce'],
			['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'É', '\u0302', '\u0308', '\u0327']
		],
		azerty: [
			['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '\u232b'],
			['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'Ù', '\u23ce'],
			['W', 'X', 'C', 'V', 'B', 'N', 'É', 'È', 'Ç', 'À', '\u0302', '\u0308']
		]
	};

	const possibleCombinations = {
		'\u0327': ['C'],
		'\u0302': ['A', 'E', 'I', 'O', 'U'],
		'\u0308': ['E', 'I', 'U'],
		'\u0300': ['A', 'E', 'U']
	};

	const controlKeys = ['\u23ce', '\u232b'];

	rowState.subscribe((value) => {
		rows = value;
		keyRows = keyRows;
	});

	$: {
		keyRows.map((r) =>
			r.map((k) => {
				k.class = getKeyClass(k.glyph);
				return k;
			})
		);
		keyRows = keyRows;
	}

	inputState.subscribe((value) => {
		inputLetters = value == null ? null : value.filter((x) => x != '/0');
	});

	layoutState.subscribe((value) => {
		if (!Object.keys(layouts).includes(value)) value = 'qwerty';
		azertyLayout = value == 'azerty';
		const currentLayout = layouts[value];
		keyRows = currentLayout.map((r) =>
			r.map((k) => {
				return { glyph: k, class: getKeyClass(k) };
			})
		);
	});

	$: layoutState.set(azertyLayout ? 'azerty' : 'qwerty');

	function updateDate() {
		const nowDate = new Date();
		const now = Date.UTC(
			nowDate.getUTCFullYear(),
			nowDate.getUTCMonth(),
			nowDate.getUTCDate(),
			nowDate.getUTCHours(),
			nowDate.getUTCMinutes(),
			nowDate.getUTCSeconds()
		);
		const secondsLeft = Math.floor((tomorrow - now) / 1000);
		timeLeft = `${Math.floor((secondsLeft / 60 / 60) % 24)
			.toString()
			.padStart(2, '0')}:${Math.floor((secondsLeft / 60) % 60)
			.toString()
			.padStart(2, '0')}:${Math.floor(secondsLeft % 60)
			.toString()
			.padStart(2, '0')}`;
	}

	progressState.subscribe((value) => {
		if (value == 'won' || value == 'lost') {
			inputLetters = null;
			setInterval(updateDate, 1000);
			updateDate();
		}
		progress = value;
	});

	let scoreHistory = {};
	scoreHistoryState.subscribe((value) => {
		scoreHistory = value;
	});

	/**
	 * @param {KeyboardEvent} event
	 */
	function handleKeydown(event) {
		if (event.ctrlKey || event.metaKey) return;
		if (event.key == 'Dead' && event.code == 'BracketLeft')
			handleKey(event.shiftKey ? '\u0308' : '\u0302');
		else handleKey(event.key);
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
		return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	/**
	 * @param {string} key
	 */
	function getKeyClass(key) {
		const randomWordLetters = [...randomWord];

		// Include combination buffer if any
		if (combiningBuffer.length > 0) key = `${key}${combiningBuffer}`.normalize().toUpperCase();

		// Collate all attempted letters and their class
		let keyStates = {};
		for (const row of rows) {
			for (const rowLetter of row) {
				if (rowLetter.glyph != '\0' && rowLetter.glyph.length == 1) {
					if (keyStates[rowLetter.glyph] == 'in-place') continue;
					if (keyStates[rowLetter.glyph] == 'in-word' && rowLetter.class == 'not-in-word') continue;
					keyStates[rowLetter.glyph] = rowLetter.class;

					if (rowLetter.class == 'not-in-word') {
						// Try to kill all possible combinations as well
						const neutralizedGlyph = neutralizeAccents(rowLetter.glyph);
						for (const combination of Object.keys(possibleCombinations)) {
							if (possibleCombinations[combination].includes(neutralizedGlyph)) {
								const combinedGlyph = `${neutralizedGlyph}${combination}`.normalize();
								keyStates[combinedGlyph] = 'not-in-word';
							}
						}
						keyStates[neutralizedGlyph] = 'not-in-word';
					}
				}

				if (
					rowLetter.glyph != rowLetter.attemptedGlyph &&
					rowLetter.attemptedGlyph != null &&
					rowLetter.attemptedGlyph != '\0' &&
					rowLetter.attemptedGlyph.length == 1
				) {
					keyStates[rowLetter.attemptedGlyph] = randomWordLetters.includes(rowLetter.attemptedGlyph)
						? 'in-word'
						: 'not-in-word';
				}
			}
		}

		if (Object.keys(keyStates).includes(key)) return keyStates[key];

		const combinations = possibleCombinations[key];
		if (combinations) {
			if (
				combinations.every((letterToCombine) => {
					const combinedGlyph = `${letterToCombine}${key}`.normalize();
					return keyStates[combinedGlyph] == 'not-in-word';
				})
			)
				return 'not-in-word';

			if (
				combinations.some((letterToCombine) => {
					const combinedGlyph = `${letterToCombine}${key}`.normalize();
					return keyStates[combinedGlyph] == 'in-word';
				})
			)
				return 'in-word';

			if (
				combinations.some((letterToCombine) => {
					const combinedGlyph = `${letterToCombine}${key}`.normalize();
					return keyStates[combinedGlyph] == 'in-place';
				})
			)
				return 'in-place';
		}

		return null;
	}

	/**
	 * @param {{ class: string; glyph: string; }} key
	 */
	function isKeyDisabled(key) {
		return (
			combiningBuffer.length > 0 &&
			!possibleCombinations[combiningBuffer].includes(key.glyph) &&
			!controlKeys.includes(key.glyph) &&
			key.glyph != combiningBuffer
		);
	}

	/**
	 * @param {string} key
	 */
	function handleKey(key) {
		// DEBUG
		if (dev) {
			if (key == 'Escape') {
				window.localStorage.clear();
				window.location.reload();
				return;
			}
		}

		// Combinations
		if (Object.keys(possibleCombinations).includes(key)) {
			if (combiningBuffer.length > 0) {
				combiningBuffer = '';
				keyRows = keyRows;
			} else {
				combiningBuffer = key;
				keyRows = keyRows;
			}
			return;
		}

		// Already done!
		if (rows.length == 6 || inputLetters == null) return;

		if ((key == 'Backspace' || key == 'Delete' || key == '\u232b') && inputLetters.length != 0) {
			inputLetters.pop();
			inputState.set(inputLetters);
			return;
		}

		if (inputLetters.length == 5 && (key == 'Enter' || key == 'NumpadEnter' || key == '\u23ce')) {
			const inputWord = inputLetters.join('');

			if (!allWords.includes(inputWord)) {
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
			const normalizedRandomWord = neutralizeAccents(randomWord);
			const normalizedRandomWordLetters = [...normalizedRandomWord];

			// take care of matches first
			for (let i = 0; i < 5; i++) {
				const normalizedInputLetter = neutralizeAccents(inputWord[i]);
				const rowLetter = { glyph: inputLetters[i], attemptedGlyph: inputLetters[i] };
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
				const normalizedInputLetter = neutralizeAccents(inputWord[i]);
				const rowLetter = { glyph: inputLetters[i], attemptedGlyph: inputLetters[i] };
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

			rows = [...rows, mutatedRow];

			if (toCheck.length > 0) {
				inputLetters = [];
				if (rows.length == 6) {
					progressState.set('lost');
					scoreHistory.streak = 0;
					scoreHistory['X']++;
					scoreHistoryState.set(scoreHistory);
				}
			} else {
				progressState.set('won');

				if (rows.length == 1) {
					comment = 'Quelle chance!';
				} else if (rows.length == 2) {
					comment = 'Génial!';
				} else if (rows.length == 3) {
					comment = 'Excellent!';
				} else if (rows.length == 4) {
					comment = 'Bien joué!';
				} else if (rows.length == 5) {
					comment = 'Pas mal!';
				} else if (rows.length == 6) {
					comment = 'De justesse!';
				}
				if (comment != null) {
					resultsHidden = true;
					if (lastCommentTimer) {
						clearTimeout(lastCommentTimer);
					}
					lastCommentTimer = setTimeout(async () => {
						comment = null;
						resultsHidden = false;
					}, 1500);
				}

				scoreHistory.streak++;
				scoreHistory[rows.length + '']++;
				scoreHistoryState.set(scoreHistory);
			}

			rowState.set(rows);
			inputState.set(inputLetters);
			return;
		}

		if (inputLetters.length == 5 || !RegExp(/^\p{L}{1}$/, 'u').test(key)) return;

		if (combiningBuffer.length > 0) {
			const neutralizedKey = neutralizeAccents(key).toUpperCase();
			if (possibleCombinations[combiningBuffer].includes(neutralizedKey)) key = neutralizedKey;

			if (!possibleCombinations[combiningBuffer].includes(key)) return;

			key = `${key}${combiningBuffer}`.normalize();
			combiningBuffer = '';
			keyRows = keyRows;
		}

		inputLetters.push(key.toUpperCase());
		inputState.set(inputLetters);
	}

	function generateShareText() {
		const tiles = rows
			.map((row) =>
				row
					.map((letter) =>
						letter.class == 'in-word' ? '🟨' : letter.class == 'in-place' ? '🟩' : '⬛'
					)
					.join('')
			)
			.join('\n');
		const nowUtc = Date.UTC(
			todayDate.getUTCFullYear(),
			todayDate.getUTCMonth(),
			todayDate.getUTCDate()
		);
		const baseUtc = Date.UTC(2022, 0, 24);
		const dayCount = Math.floor((nowUtc - baseUtc) / 1000 / 60 / 60 / 24);
		// base 1, and +2 because of the word list changed on 2022/1/26 and 2022/2/3
		const dayOffset = 3;
		navigator.clipboard.writeText(
			`MOTDLE ${dayCount + dayOffset} - ${progress == 'lost' ? 'X' : rows.length}/6\n\n${tiles}`
		);
		shareButtonText = '✅ Copié!';
	}

	function toggleSettings() {
		showSettings = !showSettings;
	}
	function toggleHelp() {
		showHelp = !showHelp;
	}
	function toggleResults() {
		resultsHidden = !resultsHidden;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<container>
	<header>
		{#if (resultsHidden || progress == 'playing') && !showHelp}
			<button class="toolbar" on:click={toggleSettings}>⚙️</button>
		{/if}
		{#if (resultsHidden || progress == 'playing') && !showSettings}
			<button class="toolbar" on:click={toggleHelp}>?</button>
		{/if}
		{#if progress != 'playing' && !showHelp && !showSettings}
			<button class="toolbar" transition:fade={{ duration: 100 }} on:click={toggleResults}
				>🥇</button
			>
		{/if}
	</header>

	{#if comment != null}
		<comment-box in:fly={{ y: 25, duration: 500 }} out:fade>
			<comment-text>{comment}</comment-text>
		</comment-box>
	{/if}

	<game-board>
		<rows>
			{#each arrayOf6 as _, ri}
				<row>
					{#if ri < rows.length}
						{#each rows[ri] as letter}
							<letter-box class={letter.class}>
								<letter>{letter.glyph}</letter>
							</letter-box>
						{/each}
					{/if}
					{#if inputLetters != null}
						{#if ri == rows.length}
							{#each arrayOf5 as _, li}
								{#if li < inputLetters.length}
									<letter-box class="with-letter">
										<letter>{inputLetters[li]}</letter>
									</letter-box>
								{/if}
								{#if li >= inputLetters.length}
									<letter-box />
								{/if}
							{/each}
						{/if}
						{#if ri > rows.length}
							{#each arrayOf5 as _}
								<letter-box />
							{/each}
						{/if}
					{/if}
					{#if ri == rows.length && inError}
						<error-box out:fade>
							<error-text>Mot inconnu!</error-text>
						</error-box>
					{/if}
				</row>
			{/each}
		</rows>
	</game-board>

	{#if progress == 'won' && !resultsHidden}
		<shadow on:click={toggleResults} transition:fade={{ duration: 200 }}>&nbsp;</shadow>
		<results in:fly={{ y: 50, duration: 500 }} out:fly={{ duration: 200 }}>
			<result-text>
				<h2>Réussi en {rows.length} essai{rows.length == 1 ? '' : 's'} 🎉</h2>
				<p>
					<a href="https://fr.wiktionary.org/wiki/{encodeURIComponent(randomWord)}"
						>Définition de «{randomWord}» sur wiktionnaire</a
					>
				</p>
				<button class="share" on:click={generateShareText}>{shareButtonText}</button>
				<h4>
					⭐ {scoreHistory.streak} mot{scoreHistory.streak == 1 ? '' : 's'} découvert{scoreHistory.streak ==
					1
						? ''
						: 's'} de suite
				</h4>
				<h4>Prochain mot dans</h4>
				<h2 class="timer">{timeLeft}</h2>
			</result-text>
		</results>
	{/if}

	{#if progress == 'lost' && !resultsHidden}
		<shadow on:click={toggleResults} transition:fade={{ duration: 200 }}>&nbsp;</shadow>
		<results in:fly={{ y: 50, duration: 500 }} out:fly={{ duration: 200 }}>
			<result-text>
				<h2>Le mot était «{randomWord}»</h2>
				<p>
					<a href="https://fr.wiktionary.org/wiki/{encodeURIComponent(randomWord)}"
						>Définition sur wiktionnaire</a
					>
				</p>
				<button class="share" on:click={generateShareText}>{shareButtonText}</button>
				<h4>Prochain mot dans</h4>
				<h2 class="timer">{timeLeft}</h2>
			</result-text>
		</results>
	{/if}

	{#if showHelp}
		<shadow on:click={toggleHelp} transition:fade={{ duration: 200 }}>&nbsp;</shadow>
		<help in:fly={{ y: 50, duration: 500 }} out:fly={{ duration: 200 }}>
			<help-content>
				<p>
					<strong>MOTDLE</strong> est une adaptation française de
					<a href="https://www.powerlanguage.co.uk/wordle/">Wordle</a>.
				</p>
				<p>
					Wordle a été créé par <a href="https://www.powerlanguage.co.uk/"
						>Josh Wardle (powerlanguage)</a
					>.
				</p>
				<h4>Comment jouer?</h4>
				<p>Découvrez le mot secret du jour en 6 essais ou moins!</p>
				<p>
					Chaque essai doit être un mot de 5 lettres correctement orthographié, incluant les
					accents.
				</p>
				<p>Appuyez sur la touche Entrée, ou cliquez sur ⏎ pour confirmer un essai.</p>
				<h4>Code de couleurs</h4>
				<p>🟩 : cette lettre est dans le mot, et elle est au bon endroit.</p>
				<p>🟨 : cette lettre est dans le mot, mais pas à cet endroit.</p>
				<p>⬛ : cette lettre n'est pas dans le mot, inutile de réessayer.</p>
				<h4>Questions/commentaires?</h4>
				<p>Contactez <a href="https://twitter.com/renaudbedard">@renaudbedard</a> sur Twitter.</p>
			</help-content>
		</help>
	{/if}

	{#if showSettings}
		<shadow on:click={toggleSettings} transition:fade={{ duration: 200 }}>&nbsp;</shadow>
		<settings in:fly={{ y: 50, duration: 500 }} out:fly={{ duration: 200 }}>
			<settings-content>
				<p><strong>Disposition du clavier</strong></p>
				<p>
					<span class="clickable" on:click={() => (azertyLayout = false)}>QWERTY</span><Switch
						bind:checked={azertyLayout}
					/><span class="clickable" on:click={() => (azertyLayout = true)}>AZERTY</span>
				</p>
			</settings-content>
		</settings>
	{/if}

	<keyboard>
		{#each keyRows as row}
			<row>
				{#each row as key}
					<button
						disabled={isKeyDisabled(key)}
						class={key.glyph == '\u23ce' && progress == 'playing' && inputLetters.length == 5
							? 'highlight'
							: key.class}
						id="key_{key.glyph}"
						on:click={handleClick}>{key.glyph}</button
					>
				{/each}
			</row>
		{/each}
	</keyboard>
</container>

<style>
	:root {
		background-color: black;
		color: white;
		font-family: sans-serif;
	}

	container {
		display: grid;
		min-height: 100%;
		display: grid;
		grid-template-rows: auto 1fr auto;
		grid-template-columns: 100%;
	}

	shadow {
		position: absolute;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
	}

	header {
		display: flex;
		flex-direction: row-reverse;
		align-items: flex-end;
		justify-content: end;
		margin-bottom: 17px;
	}

	button.toolbar {
		margin-left: 0;
		margin-right: 10px;
		margin-top: 10px;
		height: 35px;
		font-weight: bold;
		padding-top: 5px;
		z-index: 100;
	}

	game-board,
	keyboard {
		align-self: bottom;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	button.share {
		margin-top: 5px;
		padding: 0px 15px;
		height: 35px;
		font-size: 12pt;
		background-color: #f3f2d9;
		border-color: rgb(187, 187, 187);
		color: rgb(46, 46, 46);
		font-weight: bold;
		border-radius: 5px;
	}
	button.share:hover {
		background-color: #eceac5;
		color: black;
	}
	button.share:active {
		background-color: #acab97;
		color: rgb(58, 58, 58);
	}

	h4 {
		margin-bottom: 0px;
	}
	h2.timer {
		margin-top: 5px;
	}

	header,
	game-board {
		gap: 1ch;
	}

	game-board {
		padding-bottom: 30px;
	}

	error-box,
	comment-box {
		float: left;
		position: absolute;
		left: 50%;
		margin-top: min(2vw, 10px);
	}

	error-text,
	comment-text {
		float: left;
		position: relative;
		left: -50%;
		background: white;
		color: black;
		padding: min(3vw, 10px);
		border-radius: min(3vw, 10px);
		font-size: min(5vw, 1em);
		text-align: center;
	}

	results,
	help,
	settings {
		display: flex;
		position: absolute;
		width: 100%;
		align-items: center;
		justify-content: center;
		top: 7em;
		pointer-events: none;
	}

	result-text {
		width: min(75%, 22em);
		background: white;
		color: black;
		padding: min(3vw, 10px);
		border-radius: min(3vw, 10px);
		box-shadow: 5px 5px 5px black;
		font-size: min(5vw, 1em);
		text-align: center;
		vertical-align: center;
		padding: 0 1.5em;
		pointer-events: auto;
	}

	help {
		top: 2em;
	}

	help-content,
	settings-content {
		width: min(80%, 35em);
		background: white;
		color: black;
		padding: min(3vw, 10px);
		border-radius: min(3vw, 10px);
		box-shadow: 5px 5px 5px black;
		font-size: min(3vw, 1em);
		text-align: center;
		vertical-align: center;
		padding: 0 1.5em;
		pointer-events: auto;
	}

	settings-content {
		width: min(75%, 15em);
		font-size: 1em;
	}

	keyboard {
		padding-bottom: 10px;
		gap: 2px;
	}

	keyboard row {
		display: flex;
		gap: 2px;
	}

	button {
		justify-items: center;
		align-items: center;
		background-color: #555555;
		height: min(15vw, 5ch);
		font-size: min(4.5vw, 14pt);
		border-radius: 2px;
		padding: min(2vw, 1ch);
		min-width: min(7vw, 3ch);
		border: 1px solid #888888;
		text-transform: capitalize;
		transition-duration: 0.05s;
		color: white;
		touch-action: manipulation;
		margin: 0;
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
		background-color: black;
		border: 2px solid #3d3d3d;
		width: min(15vw, 7ch);
		height: min(15vw, 7ch);
	}

	letter-box.not-in-word,
	letter-box.in-word,
	letter-box.in-place {
		border: 0;
	}

	letter-box.not-in-word {
		color: #cccccc;
	}

	letter-box.with-letter {
		border: 2px solid #696969;
	}

	letter {
		font-size: min(10vw, 2em);
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
		background-color: #222222;
		color: #999999;
	}

	button:disabled {
		background-color: #000000;
		color: #000000;
	}

	.highlight {
		animation-name: color;
		animation-duration: 1s;
		animation-iteration-count: infinite;
	}

	@keyframes color {
		0% {
			background-color: #555555;
		}
		50% {
			background-color: rgb(105, 105, 105);
		}
		100% {
			background-color: #555555;
		}
	}

	.clickable {
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: dotted;
	}
</style>
