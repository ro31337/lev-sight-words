// ==UserScript==
// @name         Sight Words while youtubing
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows sight words quiz while watching youtube videos
// @author       Roman Pushkin
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

let gInterval = null;
const activationInterval = 3; //60 * 15; // in seconds

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
  const timeForTestUrl = `${baseUrl}/time-for-test2.mp3`;
  const correctUrl = `${baseUrl}/correct.mp3`;
  const noUrl = `${baseUrl}/no.mp3`;

  const words = [
    { word: 'and', url: `${baseUrl}/word-and.mp3`, testUrl: `${baseUrl}/word-and-test.mp3` },
    { word: 'for', url: `${baseUrl}/word-for.mp3`, testUrl: `${baseUrl}/word-for-test.mp3` },
    { word: 'the', url: `${baseUrl}/word-the.mp3`, testUrl: `${baseUrl}/word-the-test.mp3` },
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

    #xx-word, #xx-quiz {
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

    #xx-quiz {
      animation: makeVisible 0s 1s forwards;
      visibility: hidden;
    }

    @keyframes makeVisible {
      to   { visibility: visible; }
    }

    #xx-quiz span {
      background-color: white;
      padding: 0 60px;
      cursor: pointer;
      border: solid 2px #999;
      border-radius: 15px;
    }

    #xx-quiz span.incorrect:not(:active) {
      /* now keep red background for 1s */
      transition: background-color 1000ms step-end;
      -webkit-animation-name: wobble;
      animation-name: wobble;
      -webkit-animation-duration:          0.5s;
      -webkit-animation-iteration-count:   1;
      -webkit-animation-timing-function:   linear;
      -webkit-transform-origin:            50% 100%;
    }

    #xx-quiz span.incorrect:active {
      background-color: red;
    }

    @-webkit-keyframes wobble {
      0% {
        -webkit-transform: none;
        transform: none;
      }

      15% {
        -webkit-transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg);
        transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg);
      }

      30% {
        -webkit-transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg);
        transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg);
      }

      45% {
        -webkit-transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg);
        transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg);
      }

      60% {
        -webkit-transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg);
        transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg);
      }

      75% {
        -webkit-transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg);
        transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg);
      }

      100% {
        -webkit-transform: none;
        transform: none;
      }
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

  const showQuiz = (words, correctIndex) => {
    // Generate quiz html
    let html = `<div id="xx-quiz">`;
    for (let i = 0; i < 3; i++) {
      const obj = words[i];
      html += `<span id="xx-quiz-${i}" class="${i === correctIndex ? 'correct' : 'incorrect'}">${obj.word}</span>`;
    }
    html += `</div>`;

    // Create element
    let div = document.getElementById('xx-quiz');
    if (!div) {
      div = document.createElement('div');
      document.body.appendChild(div);
    }

    // Set click handlers

    div.innerHTML = html;
  };

  const main = async () => {
    pauseVideo();
    disableScroll();
    blockScreen();
    showWord('✋');
    //await playUrl(introUrl);
    shuffleArray(words);

    // show
    // for (let i = 0; i < words.length; i++) {
    //   const obj = words[i];
    //   showWord(obj.word);
    //   await playUrl(obj.url);
    // }

    // remove word
    removeElement('xx-word');

    // test with the same sequence for now (to be improved later)
    //await playUrl(timeForTestUrl);

    // Test 3 words
    for (let i = 0; i < 3; i++) {
      const obj = words[i];
      showQuiz(words, i);
      await playUrl(obj.testUrl);
      // show quiz here
    }

    await playUrl(outroUrl);

    // Time for test

    //enableScroll();
    //unblockScreen();
    //playVideo();
  };

  // Debug with:
  // localStorage.removeItem('xxCnt'); localStorage.removeItem('xxTimestamp');
  const onInterval = async () => {
    console.log('interval');

    // tick only if video is currently playing,
    // see https://developers.google.com/youtube/iframe_api_reference
    if (document.getElementById('movie_player').getPlayerState() !== 1) {
      console.log('skip interval');
      return;
    }

    const recordedTimestamp = (localStorage.xxTimestamp || Date.now()) * 1;
    let recordedCnt = (localStorage.xxCnt || 0) * 1;
    const diff = Date.now() - recordedTimestamp;

    console.log(`recorded timestamp: ${recordedTimestamp}, recordedCnt: ${recordedCnt}, diff: ${diff}`);

    // If last recorded timestamp was a long time ago (more than 1 minute), then browser was closed,
    // reset the counter.
    if (diff > 60000) {
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
