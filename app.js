// ==UserScript==
// @name         Sight Words while youtubing
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows sight words quiz while watching youtube videos
// @author       Roman Pushkin
// @match        https://www.youtube.com/watch*
// @grant        none
// ==/UserScript==

let gInterval = null;
const activationInterval = 60 * 15; // in seconds

function addGlobalStyle(css) {
  var head, style;
  head = document.getElementsByTagName('head')[0];
  if (!head) { return; }
  style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = css;
  head.appendChild(style);
}

// Fisher-Yates Shuffle, shuffle array in place
function shuffleArray(array) {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    let index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function removeElement(id) {
  var elem = document.getElementById(id);
  if (elem) elem.parentNode.removeChild(elem);
}

(async () => {
  'use strict';

  const baseUrl = 'https://raw.githubusercontent.com/ro31337/lev-sight-words/master';
  const introUrl = `${baseUrl}/intro.mp3`;
  const words = [
    { word: 'and', url: `${baseUrl}/word-and.mp3` },
    { word: 'for', url: `${baseUrl}/word-for.mp3` },
    { word: 'the', url: `${baseUrl}/word-the.mp3` },
  ];
  const outroUrl = `${baseUrl}/outro.mp3`;

  addGlobalStyle(`
    #xx-blocker {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #f0f0f0;
      z-index: 9999999;
    }

    #xx-word {
      z-index: 99999999;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      font-size: 90px;
      font-family: Arial;
      color: #333;
      position: absolute;
      display: grid;
      place-items: center center;
    }

    body.disable-scroll {
      overflow: hidden;
    }
  `);

  const blockScreen = () => {
    const div = document.createElement("div");
    div.id = 'xx-blocker';
    document.body.appendChild(div);
  };

  const unblockScreen = () => {
    removeElement('xx-word');
    removeElement('xx-blocker');
  };

  const disableScroll = () => {
    document.body.classList.add('disable-scroll');
  };

  const enableScroll = () => {
    document.body.classList.remove('disable-scroll');
  };

  const pauseVideo = () => {
    try {
      document.getElementById('movie_player').pauseVideo();
    } catch {}
  };

  const playVideo = () => {
    try {
      document.getElementById('movie_player').playVideo();
    } catch {}
  };

  const playUrl = (url) => {
    return new Promise((resolve) => {
      const mySound = new Audio(url);
      mySound.volume = 0.25;
      mySound.onended = resolve;
      mySound.play();
    });
  };

  const showWord = (word) => {
    // get or create element
    let div = document.getElementById('xx-word');
    if (!div) {
      div = document.createElement('div');
      div.id = 'xx-word';
      document.body.appendChild(div);
    }
    div.innerText = word;
  };

  const main = async () => {
    pauseVideo();
    disableScroll();
    blockScreen();
    showWord('✋');
    await playUrl(introUrl);
    shuffleArray(words);

    for (let i = 0; i < words.length; i++) {
      const obj = words[i];
      showWord(obj.word);
      await playUrl(obj.url);
    }
    await playUrl(outroUrl);
    enableScroll();
    unblockScreen();
    playVideo();
  };

  // Debug with:
  // localStorage.removeItem('xxCnt'); localStorage.removeItem('xxTimestamp');
  const onInterval = async () => {
    console.log('interval');
    const recordedTimestamp = (localStorage.xxTimestamp || Date.now()) * 1;
    let recordedCnt = (localStorage.xxCnt || 0) * 1;

    const diff = Date.now() - recordedTimestamp;

    // If last recorded timestamp was a long time ago (more than 5 seconds), then browser was closed,
    // reset the counter.
    if (diff > 5000) {
      recordedCnt = 0;
    }

    // Dont run main at the very beginning (recordedCnt is 0)
    // Run every "activationInterval" seconds.
    if ((recordedCnt !== 0) && (recordedCnt % activationInterval === 0)) {
      clearInterval(gInterval);
      await main();
      // resume interval
      gInterval = setInterval(onInterval, 1000);
    }

    localStorage.xxTimestamp = Date.now();
    localStorage.xxCnt = recordedCnt + 1;
  };

  gInterval = setInterval(onInterval, 1000);
})();
