<script>
  import { each } from "svelte/internal";

  var rows = [
    [ 'a', 'b', 'c', 'd', 'e' ],
    [ 'f', 'g', 'h', 'i', 'j' ]
  ]
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
  </rows>
</game-board>
