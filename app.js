// ==UserScript==
// @name         Sight Words + math while youtubing
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Shows sight words quiz while watching youtube videos
// @author       Roman Pushkin
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

let gInterval = null;
const activationInterval = 3;//60 * 15; // in seconds

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

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function removeElement(id) {
  var elem = document.getElementById(id);
  if (elem) elem.parentNode.removeChild(elem);
}

setTimeout(async () => {
  'use strict';

  const baseUrl = 'https://raw.githubusercontent.com/ro31337/lev-sight-words/master';
  const introUrl = `${baseUrl}/intro.mp3`;
  const timeForTestUrl = `${baseUrl}/time-for-test2.mp3`;
  const correctUrl = `${baseUrl}/correct.mp3`;
  const noUrl = `${baseUrl}/no.mp3`;
  const outroUrl = `${baseUrl}/outro.mp3`;

  const getWord = (word) => {
    return { word, id: word, url: `${baseUrl}/word-${word}.mp3`, testUrl: `${baseUrl}/word-${word}-test.mp3` };
  };

  const getWeight = (word) => {
    if (!localStorage.xxWeights) return 1;
    return JSON.parse(localStorage.xxWeights)[word] || 1;
  };

  // Will adjust weight within the range of 1..10. Note that weight will increase probability
  // of the element being peeked by WeightedList.
  // value should be +1 or -1
  const adjustWeight = (word, value) => {
    const weights = JSON.parse(localStorage.xxWeights || '{}');
    const weight = weights[word] || 1;
    const newWeight = weight + value;

    if (newWeight >= 1 && newWeight <= 10) {
      weights[word] = newWeight;
    }

    localStorage.xxWeights = JSON.stringify(weights);
  };

  let wl = null;
  const initWl = () => {
    // Little bit reduntant, but it's okay.
    const data = [
      ['and', getWeight('and'), getWord('and')],
      ['for', getWeight('for'), getWord('for')],
      ['the', getWeight('the'), getWord('the')],
      ['a', getWeight('a'), getWord('a')],
      ['in', getWeight('in'), getWord('in')],
      ['is', getWeight('is'), getWord('is')],
      ['of', getWeight('of'), getWord('of')],
      ['to', getWeight('to'), getWord('to')],
      ['you', getWeight('you'), getWord('you')],
      ['see', getWeight('see'), getWord('see')],
      ['they', getWeight('they'), getWord('they')],
      ['can', getWeight('can'), getWord('can')],
      ['go', getWeight('go'), getWord('go')],
      ['like', getWeight('like'), getWord('like')],
      ['we', getWeight('we'), getWord('we')],
      ['have', getWeight('have'), getWord('have')],
      ['want', getWeight('want'), getWord('want')],
    ];

    console.log('Reinitializing weighed list, new data:');
    console.log(data);
    // Wrap in try-catch block. In case our data is incorrect we'll see exception in console.
    try {
      wl = new WeightedList(data);
    } catch (err) { console.log(err); }
  };
  initWl();

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

    #xx-quiz span.correct:active {
      background-color: #E0FFDD;
    }

    #xx-quiz span.correct:not(:active) {
      transition: background-color 3000ms step-end;
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

    #xx-math {
      z-index: 99999999;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      position: absolute;
      display: grid;
      place-items: center center;
    }

    #xx-math #xx-math-content-container {
      width: 100%;
      max-width: 920px;
    }

    #xx-math #xx-math-quiz {
      width: 100%;
      max-width: 1200px;
    }

    #xx-math #xx-math-content {
      font-family: Arial;
      /* background-color: #f0f0f0; */
      color: #333;
      font-size: 80px;

      display: flex;
      flex-direction: row;
      flex-wrap: no-wrap;
      justify-content: space-evenly;
    }

    #xx-math #xx-math-content .one,
    #xx-math #xx-math-content .two,
    #xx-math #xx-math-content .three {
      display: flex;
      flex-direction: column;
      /* background-color: #d0d0d0; */
      text-align: center;
    }

    #xx-math #xx-math-content .one .hint,
    #xx-math #xx-math-content .two .hint,
    #xx-math #xx-math-content .three .hint {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      /* background-color: #e0e0e0; */
      justify-content: flex-start;
    }

    #xx-math #xx-math-content .hint.less-than-five {
      justify-content: center;
      padding-left: 19px;
    }

    #xx-math #xx-math-content .one,
    #xx-math #xx-math-content .two,
    #xx-math #xx-math-content .three {
      flex-grow: 1;
      max-width: 300px;
    }
    #xx-math #xx-math-content .one .element,
    #xx-math #xx-math-content .two .element,
    #xx-math #xx-math-content .three .element {
      width: calc(20% - 10px);
    }

    #xx-math .element {
      width: 20px;
      height: 20px;
      border-radius: 20px;
      transition: left 1s linear, top 1s linear;
      opacity: 0.01; /* change to 0.01 or to 0.4 */
      border: solid 4px #f0f0f0;
    }

    #xx-math .element.first {
      background-color: #c08a6c;
    }
    #xx-math .element.second {
      background-color: #9b5c3f;
    }

    #xx-math-quiz {
      width: 100%;
      font-size: 40px;
      font-family: Arial;
      color: #333;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: space-evenly;
    }

    #xx-math-quiz {
      animation: makeVisible 0s 1s forwards;
      visibility: hidden;
    }

    #xx-math-quiz span {
      background-color: white;
      padding-left: 30px;
      padding-right: 30px;
      cursor: pointer;
      border: solid 2px #999;
      border-radius: 15px;
      display: block;
    }

    #xx-math-quiz span.correct:active {
      background-color: #E0FFDD;
    }

    #xx-math-quiz span.correct:not(:active) {
      transition: background-color 3000ms step-end;
    }

    #xx-math-quiz span.incorrect:not(:active) {
      /* now keep red background for 1s */
      transition: background-color 1000ms step-end;
      -webkit-animation-name: wobble;
      animation-name: wobble;
      -webkit-animation-duration:          0.5s;
      -webkit-animation-iteration-count:   1;
      -webkit-animation-timing-function:   linear;
      -webkit-transform-origin:            50% 100%;
    }

    #xx-math-quiz span.incorrect:active {
      background-color: red;
    }
  `);

  const blockScreen = () => {
    const div = document.createElement("div");
    div.id = 'xx-blocker';
    document.body.appendChild(div);
  };

  const unblockScreen = () => {
    removeElement('xx-word');
    removeElement('xx-math');
    removeElement('xx-quiz');
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
    } catch (err) { console.log(err);}
  };

  const playVideo = () => {
    try {
      document.getElementById('movie_player').playVideo();
    } catch (err) { console.log(err); }
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

  const showQuiz = async (selectedObj) => {
    // Generate quiz html
    let html = `<div id="xx-quiz">`;
    const randomObjects = wl.peek(3); // We need 2, but peek 3 in case we have selected word randomly selected as well

    // Exclude selected word if any, and use only ".data" subset from random objects result
    const dup = randomObjects.reduce((acc, x) => { if (x.data.id !== selectedObj.id) { acc.push(x.data); }; return acc; }, []);

    // quiz array, 3 elements only, one is selected
    const arr = [];
    arr.push(dup.pop());
    arr.push(dup.pop());
    arr.push(selectedObj);
    shuffleArray(arr);

    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      html += `<span id="xx-quiz-${obj.id}" class="${obj.word === selectedObj.word ? 'correct' : 'incorrect'}">${obj.word}</span>`;
    }
    html += `</div>`;

    // Create element
    let div = document.getElementById('xx-quiz');
    if (!div) {
      div = document.createElement('div');
      document.body.appendChild(div);
    }

    // Show
    div.innerHTML = html;

    // Track the state of incorrect attempts
    let incorrectCnt = 0;
    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      if (obj.id !== selectedObj.id) {
        document.getElementById('xx-quiz-' + obj.id).onclick = () => {
          incorrectCnt = incorrectCnt + 1;
        }
      }
    }

    // Play file
    playUrl(selectedObj.testUrl);

    return new Promise(async (resolve) => {
      document.getElementById('xx-quiz-' + selectedObj.id).onclick = async () => {
        if (incorrectCnt == 0) {
          adjustWeight(selectedObj.word, -1);
        } else {
          adjustWeight(selectedObj.word, +1);
        }
        initWl();
        await playUrl(correctUrl);
        resolve();
      };
    });
  };

  const memorize = async () => {
    showWord('✋');
    // await playUrl(introUrl);
    // Reduce because we need only ".data" subset from weighted list
    const words = wl.peek(3).reduce((acc, x) => { acc.push(x.data); return acc; }, []);

    // memorize three words
    for (let i = 0; i < 3; i++) {
      const obj = words[i];
      showWord(obj.word);
      await playUrl(obj.url);
    }
    await playUrl(outroUrl);
  };

  const quiz = async() => {
    // test with the same sequence for now (to be improved later)
    await playUrl(timeForTestUrl);
    const words = wl.peek(3).reduce((acc, x) => { acc.push(x.data); return acc; }, []);

    // Test 3 words
    for (let i = 0; i < 3; i++) {
      const selectedObj = words[i];
      await showQuiz(selectedObj);
      // show quiz here
    }
    removeElement('xx-quiz');
  };

  const mathQuiz = async() => {
    const moveDotsToTheRight = () => {
      const elements = document.querySelectorAll('div[data-shadow-id]');
      for (var i = 0, len = elements.length; i < len; i++) {
        const element = elements.item(i);
        const id = element.getAttribute('data-shadow-id');
        const placeholder = document.querySelector(`div[data-placeholder-id="${id}"]`);

        const rect = placeholder.getBoundingClientRect();
        const offsets = {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
        };

        element.style.cssText = `position: absolute; top: ${offsets.top}px; left: ${offsets.left}px; opacity: 1;`;
      }
    };

    const createShadows = () => {
      const elements = document.querySelectorAll('div[data-element-id]');
      const content = document.getElementById('xx-math-content');

      for (var i = 0, len = elements.length; i < len; i++) {
        //alert(elements.item(i));
        const element = elements.item(i);
        const rect = element.getBoundingClientRect();
        const offsets = {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
        };

        const id = element.getAttribute('data-element-id');

        const shadowElement = document.createElement('div');
        shadowElement.classList = element.classList;
        shadowElement.style.cssText = `position: absolute; top: ${offsets.top}px; left: ${offsets.left}px; opacity: 1;`;
        content.appendChild(shadowElement);

        shadowElement.setAttribute('data-shadow-id', id);
      }
    };

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     * The value is no lower than min (or the next integer greater than min
     * if min isn't an integer) and no greater than max (or the next integer
     * lower than max if max isn't an integer).
     * Using Math.round() will give you a non-uniform distribution!
     */
    const getRandomInt = (min, max) => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const numbersAndWeights = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [7, 3],
      [8, 2],
      [9, 1],
    ];

    const numbersWl = new WeightedList(numbersAndWeights);

    const initMath = () => {
      // Get numbers based on their weights
      let x = 999;
      let y = 999;

      while (x + y > 10) {
        x = numbersWl.peek() * 1;
        y = numbersWl.peek() * 1;
      }

      const sum = x + y;

      // Below we use tricky construction so we have natural sequence 1 2 3 4 5 6 7 8 9 10
      // when x is 8 and y is 2, and 3 4 5 6 7 8 9 10 1 2 sequence when x is 2 and y is 8.
      // It makes animations much more easier to understand.
      //
      //    > sum = 10
      //      10
      //    > x = 2
      //      2
      //    > y = 8
      //      8
      //    > Array(sum).fill().map((_, i) => y > x ? ((i + x + 1) % sum === 0 ? sum : (i + x + 1) % sum) : i + 1).join(' ')
      //      '3 4 5 6 7 8 9 10 1 2'
      //    > x = 8
      //      8
      //    > y = 2
      //      2
      //    > Array(sum).fill().map((_, i) => y > x ? ((i + x + 1) % sum === 0 ? sum : (i + x + 1) % sum) : i + 1).join(' ')
      //      '1 2 3 4 5 6 7 8 9 10'
      //

      const html = `
        <div id="xx-math-content-container">
          <div id="xx-math-content">
            <div class="one">
              <div class="value">${x}</div>
              <div class="hint ${x > 5 ? 'more-than-five' : 'less-than-five'}">
                ${Array(x).fill().map((_, i) => `<div class="element first" data-element-id="${i + 1}"></div>`).join('')}
              </div>
            </div>
            <div class="plus">+</div>
            <div class="two">
              <div class="value">${y}</div>
              <div class="hint ${y > 5 ? 'more-than-five' : 'less-than-five'}"">
                ${Array(y).fill().map((_, i) => `<div class="element second" data-element-id="${x + i + 1}"></div>`).join('')}
              </div>
            </div>
            <div class="makes">=</div>
            <div class="three">
              <div id="xx-math-sum-placeholder" class="value" style="opacity: 0.01">${sum}</div>
              <div class="hint ${sum > 5 ? 'more-than-five' : 'less-than-five'}"">
                ${Array(sum).fill().map((_, i) => `<div class="element" data-placeholder-id="${y > x ? ((i + x + 1) % sum === 0 ? sum : (i + x + 1) % sum) : i + 1}"></div>`).join('')}
              </div>
            </div>
          </div>
        </div>
        <div id="xx-math-quiz">
          ${Array(11).fill().map((_, i) => `<span id="xx-math-quiz-${i}" class="${i === sum ? 'correct' : 'incorrect'}">${i}</span>`).join('')}
        </div>
      `;

      // Add html to the dom
      const target = document.getElementById('xx-blocker');
      const div = document.createElement("div");
      div.id = 'xx-math';
      div.innerHTML = html;
      target.appendChild(div);

      // Example of setting success click handler:
      // Commented out for compatibility with TamperMonkey script
      // document.getElementById(`xx-math-quiz-${sum}`).onclick = () => {
      //   moveDotsToTheRight();
      //   document.getElementById('xx-math-sum-placeholder').style.opacity = 1;
      // }

      for (let i = 0; i <= 10; i++) {
        document.getElementById(`xx-math-quiz-${i}`).onclick = () => { moveDotsToTheRight() };
      }

      // Create shadow dots
      setTimeout(createShadows, 1000);

      return sum;
    }

    const correctAnswer = initMath();

    // Yes, wait 300ms so xx-math and all other elements are present
    await sleep(300);

    return new Promise(async (resolve) => {
      // Set success click handler
      document.getElementById(`xx-math-quiz-${correctAnswer}`).onclick = async () => {
        moveDotsToTheRight();
        document.getElementById('xx-math-sum-placeholder').style.opacity = 1;
        await sleep(1500);
        resolve();
      }
    });
  }

  const main = async () => {
    try {
      pauseVideo();
      disableScroll();
      blockScreen();
      //await playUrl(introUrl);

      const rand = 3;//getRandomInt(1, 3);
      if (rand === 1) {
        await memorize();
      } else if (rand === 2) {
        await quiz();
      } else {
        await mathQuiz();
      }

      enableScroll();
      unblockScreen();
      playVideo();
    } catch (err) {
      console.log(err);
    }
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

  console.log('setting interval');

  gInterval = setInterval(onInterval, 1000);
}, 300);

/**
 * js-weighted-list.js
 * 
 * version 0.2
 * 
 * This file is licensed under the MIT License, please see MIT-LICENSE.txt for details.
 * 
 * https://github.com/timgilbert/js-weighted-list is its home.
 */

var WeightedList = (function () {

  function _WeightedList(initial) {
    this.weights = {};
    this.data = {};
    this.length = 0;
    this.hasData = false;

    initial = typeof initial !== 'undefined' ? initial : [];

    if (Array.isArray(initial)) {
      for (var i = 0; i < initial.length; i++) {
        //var item = initial[i];
        //this.push(item[0], item[1], item[2]);
        this.push(initial[i]);
      }
    } else {
      throw new Error('Unknown object "' + initial.toString() + '" passed to ' +
        'WeightedList constructor! (Expected array or nothing)');
    }
  }

  _WeightedList.prototype = {
    /**
     * Add a single item to the list.  The parameter passed in represents a single 
     * key, with a weight and optionally some data attached.
     * 
     * The parameter to this function can either be a 2-3 element array of 
     * [k, w, d] for key, weight and data (data is optional) or an object with the 
     * values {'key': k, 'weight': w, 'data': d} where d is optional.
     */
    push: function (element) {
      var key, weight, data;

      if (Array.isArray(element)) {
        key = element[0], weight = element[1], data = element[2];
        if (typeof key === 'undefined') {
          // Eg, wl.push([])
          throw new Error('In WeightedList.push([ ... ]), need at least two elements');
        } else if (typeof weight === 'undefined') {
          // I suppose we could default to 1 here, but the API is already too forgiving
          throw new Error('In array passed to WeightedList.push([ ... ]), second ' +
            'element is undefined!');
        }
      } else if (typeof element === 'object') {
        // We expect {"key": "zombies", "weight": 10, "data": {"fast": true}}
        key = element.key, weight = element.weight, data = element.data;
        if (typeof key === 'undefined') {
          throw new Error("In WeightedList.push({ ... }), no {'key': 'xyzzy'} pair found");
        } else if (typeof weight === 'undefined') {
          // I suppose we could default to 1 here, but the API is already too forgiving
          throw new Error('In array passed to WeightedList.push({ ... }), no ' +
            "{'weight': 42} pair found");
        }
      } else {
        // else what the heck were you trying to give me?
        throw new Error('WeightedList.push() passed unknown type "' + typeof element +
          '", expected [key, weight] or {"key": k, "weight": w}');
      }
      return this._push_values(key, weight, data);

    },
    /**
     * Add an item to the list
     * @access private
     * @param {String} key the key under which this item is stored
     * @param {number} weight the weight to assign to this key
     * @param {?Object} data any optional data associated wth this key
     */
    _push_values: function (key, weight, data) {
      //console.debug('k:', key, 'w:', weight, 'd:', data);

      if (this.weights[key]) {
        throw new Error('');
      }
      if (typeof weight !== typeof 1) {
        throw new Error('Weight must be numeric (got ' + weight.toString() + ')');
      }
      if (weight <= 0) {
        throw new Error('Weight must be >= 0 (got ' + weight + ')');
      }

      this.weights[key] = weight;

      if (typeof data !== 'undefined') {
        this.hasData = true;
        this.data[key] = data;
      }
      this.length++;
    },

    /** 
     * Add the given weight to the list item with the given key.  Note that if 
     * the key does not already exist, this operation will silently create it.
     * 
     * @todo might be nice to have a version of this that would throw an error 
     *       on an unknown key.
     */
    addWeight: function (key, weight) {
      this.weights[key] += weight;
    },

    /**
     * Select n random elements (without replacement), default 1.
     * If andRemove is true (default false), remove the elements
     * from the list.  (This is what the pop() method does.)
     */
    peek: function (n, andRemove) {
      if (typeof n === 'undefined') {
        n = 1;
      }
      andRemove = !!andRemove;

      if (this.length - n < 0) {
        throw new Error('Stack underflow! Tried to retrieve ' + n +
          ' element' + (n === 1 ? '' : 's') +
          ' from a list of ' + this.length);
      }

      var heap = this._buildWeightedHeap();
      //console.debug('heap:', heap);
      var result = [];

      for (var i = 0; i < n; i++) {
        var key = heap.pop();
        //console.debug('k:', key);
        if (this.hasData) {
          result.push({ key: key, data: this.data[key] });
        } else {
          result.push(key);
        }
        if (andRemove) {
          delete this.weights[key];
          delete this.data[key];
          this.length--;
        }
      }
      return result;
    },

    /**
     * Return the entire list in a random order (note that this does not mutate the list)
     */
    shuffle: function () {
      return this.peek(this.length);
    },

    /**
     * 
     */
    pop: function (n) {
      return this.peek(n, true);
    },

    /**
     * Build a WeightedHeap instance based on the data we've got
     */
    _buildWeightedHeap: function () {
      var items = [];
      for (var key in this.weights) if (this.weights.hasOwnProperty(key)) {
        items.push([key, this.weights[key]]);
      }
      //console.log('items',items);
      return new _WeightedHeap(items);
    }
  };

  /**
   * This is a javascript implementation of the algorithm described by 
   * Jason Orendorff here: http://stackoverflow.com/a/2149533/87990
   */
  function _HeapNode(weight, value, total) {
    this.weight = weight;
    this.value = value;
    this.total = total;  // Total weight of this node and its children
  }
  /**
   * Note, we're using a heap structure here for its tree properties, not as a 
   * classic binary heap. A node heap[i] has children at heap[i<<1] and at 
   * heap[(i<<1)+1]. Its parent is at h[i>>1]. Heap[0] is vacant.
   */
  function _WeightedHeap(items) {
    this.heap = [null];   // Math is easier to read if we index array from 1

    // First put everything on the heap 
    for (var i = 0; i < items.length; i++) {
      var weight = items[i][1];
      var value = items[i][0];
      this.heap.push(new _HeapNode(weight, value, weight));
    }
    // Now go through the heap and add each node's weight to its parent
    for (i = this.heap.length - 1; i > 1; i--) {
      this.heap[i >> 1].total += this.heap[i].total;
    }
    //console.debug('_Wh heap', this.heap);
  }

  _WeightedHeap.prototype = {
    pop: function () {
      // Start with a random amount of gas
      var gas = this.heap[1].total * Math.random();

      // Start driving at the root node
      var i = 1;

      // While we have enough gas to keep going past i:
      while (gas > this.heap[i].weight) {
        gas -= this.heap[i].weight;     // Drive past i
        i <<= 1;                        // Move to first child
        if (gas > this.heap[i].total) {
          gas -= this.heap[i].total;    // Drive past first child and its descendants
          i++;                          // Move on to second child
        }
      }
      // Out of gas - i is our selected node.
      var value = this.heap[i].value;
      var selectedWeight = this.heap[i].weight;

      this.heap[i].weight = 0;          // Make sure i isn't chosen again
      while (i > 0) {
        // Remove the weight from its parent's total
        this.heap[i].total -= selectedWeight;
        i >>= 1;  // Move to the next parent
      }
      return value;
    }
  };

  //  NB: another binary heap implementation is at
  // http://eloquentjavascript.net/appendix2.html

  return _WeightedList;
})();
