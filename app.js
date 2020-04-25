// ==UserScript==
// @name         Sight Words while youtubing
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Shows sight words quiz while watching youtube videos
// @author       Roman Pushkin
// @match        https://www.youtube.com/watch*
// @grant        none
// ==/UserScript==

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

(function () {
  'use strict';

  const activationInterval = 3; // in seconds
  const baseUrl = 'https://raw.githubusercontent.com/ro31337/lev-sight-words/master';
  const introUrl = `${baseUrl}/intro.mp3`;
  const words = [
    { word: 'and', url: `${baseUrl}/word-and.mp3` },
    { word: 'for', url: `${baseUrl}/word-for.mp3` },
    { word: 'the', url: `${baseUrl}/word-the.mp3` },
  ];

  addGlobalStyle(`
    .blocker {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: yellow;
      z-index: 9999999;
      position: fixed;
    }
  `);

  const blockScreen = () => {
    const div = document.createElement("div");
    div.setAttribute('class', 'blocker');
    document.body.appendChild(div);
  };

  const playUrl = (url) => {
    return new Promise((resolve) => {
      const mySound = new Audio(url);
      mySound.onended = resolve;
      mySound.play();
    });
  };

  const onInterval = () => {
    document.getElementById('movie_player').pauseVideo();
    blockScreen();
    playUrl(introUrl).then(() => {
      console.log('ENDED OK!');
    });
    //await sleep(1000)


    // document.getElementById('movie_player').resumeVideo();

    // TODO: set interval when complete
  };

  setTimeout(onInterval, activationInterval * 1000);
})();
