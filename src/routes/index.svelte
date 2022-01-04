<script context="module">
  export async function load({ params, fetch, session, stuff }) {
    const response = await fetch('../mots-francais-5-lettres.json');
    return {
      props: {
        allWords: await response.json()
      }
    };
  }
</script>

<script>
  import { each } from "svelte/internal";
  import { fade } from 'svelte/transition';

  var rows = []

  let letterCursor = 0;
  let inputLetters = ['', '', '', '', '']
  let inError = false;
  let lastErrorTimer;
  export let allWords;

  function handleKeydown(event) {
    if (event.ctrlKey)
      return;

    if ((event.key == 'Backspace' || event.key == 'Delete') && letterCursor > 0) {
      letterCursor--;
      inputLetters[letterCursor] = '';
      return;
    }

    if (letterCursor == 5 && (event.key == 'Enter' || event.key == 'NumpadEnter')) {
      const inputWord = inputLetters.join("").toUpperCase();
      if (!allWords.includes(inputWord)) {
        inError = true;
        if (lastErrorTimer) {
          clearTimeout(lastErrorTimer);
        }
        lastErrorTimer = setTimeout(async () => { inError = false; }, 1000)
        return;
      }
      rows = [...rows, inputLetters]
      inputLetters = ['', '', '', '', ''];
      letterCursor = 0;
    }

    if (letterCursor == 5 || !RegExp(/^\p{L}{1}$/,'u').test(event.key))
      return;

      inputLetters[letterCursor] = event.key;
    letterCursor++;
  }
</script>

<style>
  :root {
    background-color: black;
    color: white;
    font-family: sans-serif; 
  }

  header, game-board {
    /* "Gentle Flex" (https://web.dev/centering-in-css/) */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1ch;
  }

  rows {
    display: grid;
    gap: 5px;
  }  

  row {
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
  
</style>

<svelte:window on:keydown={handleKeydown}/>

<header>
  <h1>WORDLE 🇫🇷</h1>
</header>

<game-board>
  <rows>
    {#each rows as row}
      <row>
        {#each row as letter}
          <letter-box>
            <letter>{letter}</letter>
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
    <error-box out:fade>
      Ce mot n'est pas reconnu!
    </error-box>
  {/if}
</game-board>
