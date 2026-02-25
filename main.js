import { CARD_ID, CARD_DEFS, buildDeck81, shuffleInPlace, canPlay } from './cards.js';
import { playSoundDraw, playSoundPlayCard, playSoundError, playSoundLose, playSoundPoint, playSoundClick, playSoundSpecial, playSoundMatchWin, setBGMVolume } from './audio.js';

// --- Game State Definition ---
let state = {
  score: { A: 0, B: 0 },
  totalPoints: 0,
  serve: "A",
  turnTeam: "A",
  deck: [],
  discard: [],
  hands: { A: [], B: [] },
  timeline: [],   // {team, cardId}
  lastCard: "SERVICIO", // 最初はサーブから
  selectedHandIndex: null, // 追加: 選択中のカードインデックス
  justDrawnIndex: { A: null, B: null },
  isAnimating: false,
  shotCount: 0,
  gameStats: { totalShots: 0, maxShots: 0, minShots: 9999, winReasons: { A: {}, B: {} } }
};

function getCardDef(id) {
  return CARD_DEFS[id];
}

// --- Hand Animation ---
function triggerHandAnimation(team, type) {
  const container = document.getElementById("app");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `hand-anim anim-${type}-${team}`;
  el.textContent = "🖐️";

  // App-specific positioning rules matching the CSS
  if (team === "A") {
    el.id = "handAnimA";
  } else {
    el.id = "handAnimB";
  }

  container.appendChild(el);

  // Remove after animation completes
  setTimeout(() => {
    if (el && el.parentNode) {
      el.remove();
    }
  }, 600);
}

// --- Init & Deck ---
function initGame() {
  generateChart();
  document.getElementById("scoreA").textContent = 0;
  document.getElementById("scoreB").textContent = 0;
  document.getElementById("actionA").innerHTML = '<span style="color:#777">Waiting...</span>';
  document.getElementById("actionB").innerHTML = '<span style="color:#777">Waiting...</span>';

  startWithCoinToss();
}

function startWithCoinToss() {
  const overlay = document.getElementById("coinTossOverlay");
  const coinContainer = document.getElementById("coinContainer");
  const coinEl = document.getElementById("coinElement");
  const cText = document.getElementById("coinText");

  if (!overlay || !coinContainer || !coinEl || !cText) {
    resetPoint();
    return;
  }

  overlay.className = "anim-toss-start";
  coinEl.className = "coin anim-toss-spinning";
  cText.textContent = "COIN TOSS";

  playSoundSpecial(); // Use special sound for toss

  setTimeout(() => {
    // Determine winner
    const isA = Math.random() < 0.5;
    const winner = isA ? "A" : "B";
    state.serve = winner;

    // Stop spinning and show result
    coinEl.className = "coin"; // Remove spin
    overlay.className = `anim-toss-start anim-toss-result${winner}`;
    coinEl.textContent = winner;

    cText.style.opacity = "1";
    cText.textContent = `SERVE: ${winner}!`;
    cText.style.animation = "none"; // Stop fade

    playSoundPoint(); // Result sound

    setTimeout(() => {
      overlay.className = "hidden";
      // Clear inline styles applied by animation override
      cText.style.opacity = "";
      cText.style.animation = "";
      coinEl.textContent = "";

      resetPoint();
      logMessage(`Game Started. 1v1 BATTLE. ${winner} Serves.`);
    }, 2000);

  }, 2000); // 2 seconds tossing
}

function generateDeck() {
  state.deck = shuffleInPlace(buildDeck81());
  state.discard = [];
}

function drawCard(team, silent = false) {
  if (state.deck.length === 0) {
    logMessage("Deck empty! Reshuffling discard...");
    state.deck = state.discard.slice().sort(() => Math.random() - 0.5);
    state.discard = [];
  }
  if (state.deck.length > 0) {
    state.hands[team].push(state.deck.pop());
    if (!silent) {
      playSoundDraw();
      triggerHandAnimation(team, 'draw');
    }
  }
}

function resetPoint() {
  generateDeck();
  state.hands = { A: [], B: [] };
  state.timeline = [];
  state.lastCard = "SERVICIO";
  state.turnTeam = state.serve;
  state.selectedHandIndex = null;
  state.justDrawnIndex = { A: null, B: null };
  state.isAnimating = false;
  state.shotCount = 0;

  // 初期ドロー5枚
  for (let i = 0; i < 5; i++) {
    drawCard("A", true);
    drawCard("B", true);
  }

  renderAll();
  if (state.turnTeam === "B") setTimeout(aiTurn, 1000);
}

function pointTo(winner) {
  const loser = winner === "A" ? "B" : "A";
  logMessage(`[!] ${loser} has no playable cards! Point goes to ${winner}`);
  state.score[winner]++;
  state.totalPoints++;
  state.serve = (state.totalPoints % 2 === 0) ? "A" : "B";

  // HUDのスコアやPTSをなるべく早く反映
  updateHUD();

  // Track winning shot for the winner
  let winningCardId = "UNKNOWN";
  for (let i = state.timeline.length - 1; i >= 0; i--) {
    if (state.timeline[i].team === winner) {
      winningCardId = state.timeline[i].cardId;
      break;
    }
  }

  if (winningCardId !== "UNKNOWN") {
    if (!state.gameStats.winReasons[winner][winningCardId]) {
      state.gameStats.winReasons[winner][winningCardId] = 0;
    }
    state.gameStats.winReasons[winner][winningCardId]++;
  }

  // Update overall rally stats
  if (state.shotCount > 0) {
    state.gameStats.totalShots += state.shotCount;
    if (state.shotCount > state.gameStats.maxShots) state.gameStats.maxShots = state.shotCount;
    if (state.shotCount < state.gameStats.minShots) state.gameStats.minShots = state.shotCount;
  }

  if (state.score.A >= 7 || state.score.B >= 7) {
    const isPlayerWin = state.score.A >= 7;
    if (isPlayerWin) {
      playSoundMatchWin();
    } else {
      playSoundLose();
    }

    const overlay = document.getElementById("matchResultOverlay");
    const title = document.getElementById("matchResultTitle");
    const sub = document.getElementById("matchResultSub");

    setTimeout(() => {
      overlay.className = isPlayerWin ? "result-win" : "result-lose";
      title.textContent = isPlayerWin ? "YOU WIN!" : "YOU LOSE...";
      sub.textContent = `FINAL SCORE: ${state.score.A} - ${state.score.B}`;

      const stats = document.getElementById("matchResultStats");
      if (stats) {
        // Prevent showing 9999 if minShots wasn't updated
        const displayMin = state.gameStats.minShots === 9999 ? 0 : state.gameStats.minShots;

        const getTop3 = (team) => {
          const reasons = state.gameStats.winReasons[team];
          const sorted = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3);
          if (sorted.length === 0) return `<div style="font-size:14px; opacity:0.6; text-align:center; margin-top:10px;">なし</div>`;
          return sorted.map((s, i) => `
            <div style="font-size:15px; display:flex; justify-content:space-between; margin-top:6px;">
              <span>${i + 1}. ${getCardDef(s[0]).nameJa}</span> 
              <span style="color:#0ff; font-weight:bold;">${s[1]}回</span>
            </div>
          `).join('');
        };

        stats.innerHTML = `
          <div style="padding-bottom:15px; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.3);">
            <div class="stat-row"><span>総プレイショット:</span> <span>${state.gameStats.totalShots}</span></div>
            <div class="stat-row"><span>最大ラリー数:</span> <span>${state.gameStats.maxShots}</span></div>
            <div class="stat-row"><span>最小ラリー数:</span> <span>${displayMin}</span></div>
          </div>
          <div style="display:flex; justify-content:space-between; gap:20px;">
            <div style="flex:1;">
              <div style="font-size:14px; color:#ff4081; font-weight:bold; border-bottom:1px solid #ff4081; padding-bottom:4px;">A (You) 決まり手</div>
              ${getTop3("A")}
            </div>
            <div style="flex:1;">
              <div style="font-size:14px; color:#00f2fe; font-weight:bold; border-bottom:1px solid #00f2fe; padding-bottom:4px;">B (COM) 決まり手</div>
              ${getTop3("B")}
            </div>
          </div>
        `;
      }

      // Celebratory particles for win
      if (isPlayerWin) {
        const container = document.getElementById("app");
        for (let i = 0; i < 60; i++) {
          setTimeout(() => {
            const p = document.createElement("div");
            p.className = "particle";
            const colors = ['#ffeb3b', '#ff4081', '#00f2fe', '#0ff'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            p.style.backgroundColor = color;
            p.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;

            p.style.top = `${10 + Math.random() * 80}%`;
            p.style.left = `${10 + Math.random() * 80}%`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = 50 + Math.random() * 200;
            p.style.setProperty("--tx", `${Math.cos(angle) * velocity}px`);
            p.style.setProperty("--ty", `${Math.sin(angle) * velocity}px`);

            container.appendChild(p);
            setTimeout(() => p.remove(), 1000);
          }, i * 40); // cascading interval
        }
      }
    }, 1000); // Wait 1 sec for final point animation to settle
    return;
  }

  if (winner === "A") {
    playSoundPoint();
  } else {
    playSoundLose();
  }

  // Flashy Point Animation Trigger
  const overlay = document.getElementById("pointOverlay");
  const pText = document.getElementById("pointText");
  if (overlay && pText) {
    pText.innerHTML = `POINT<br>${winner}!`;
    overlay.className = `anim-point-${winner}`;

    // Create Explosion Particles
    const container = document.getElementById("app");
    const color = winner === "A" ? "#ff4081" : "#00f2fe";
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.backgroundColor = color;
      p.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;

      const angle = Math.random() * Math.PI * 2;
      const velocity = 100 + Math.random() * 200;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `${ty}px`);

      container.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }

    // Reset overlay after 2 seconds
    setTimeout(() => {
      overlay.className = "hidden";
    }, 2000);
  }

  state.turnTeam = "NONE";
  setTimeout(resetPoint, 2000);
}

// --- Game Logic ---
function playCard(cardId, team) {
  if (state.turnTeam !== team || state.isAnimating) return;
  state.selectedHandIndex = null;
  state.isAnimating = true;

  // Can Play Compatibility Check
  if (state.lastCard && state.lastCard !== "SERVICIO") {
    if (!canPlay(cardId, state.lastCard)) {
      playSoundError();
      logMessage(`[!] Cannot play ${getCardDef(cardId).nameJa} after ${getCardDef(state.lastCard).nameJa}`);
      return;
    }
  }

  const def = getCardDef(cardId);
  logMessage(`${team} played ${def.nameJa}`);

  // Remove from hand, add to discard
  const idx = state.hands[team].indexOf(cardId);
  if (idx > -1) {
    state.hands[team].splice(idx, 1);
    state.discard.push(cardId);
  }

  // Record Timeline
  const previousCard = state.lastCard;

  state.timeline.push({ team, cardId });
  if (state.timeline.length > 6) state.timeline.shift();
  state.lastCard = cardId;
  state.shotCount++;

  // --- 特殊カード効果の適用 ---
  let isSpecial = false;

  if (cardId === CARD_ID.BLANCA) {
    isSpecial = true;
    if (previousCard === CARD_ID.PALA_ROTA || previousCard === CARD_ID.RED) {
      playSoundSpecial();
      logMessage(`[CARTA BLANCA] ${team}がジョーカーで反撃！強引にポイントを奪い取った！`);
      state.turnTeam = "NONE";
      renderAll();
      pointTo(team);
      return;
    }
  }



  if (cardId === CARD_ID.NEVERA) {
    isSpecial = true;
    const oppTeam = team === "A" ? "B" : "A";
    if (state.hands[oppTeam].length > 3) {
      while (state.hands[oppTeam].length > 3) {
        let rIdx = Math.floor(Math.random() * state.hands[oppTeam].length);
        let discarded = state.hands[oppTeam].splice(rIdx, 1)[0];
        state.discard.push(discarded);
      }
      logMessage(`[NEVERA] ${team}がネベラを使用！${oppTeam}の手札がランダムに捨てられ3枚になりました。`);
    } else {
      logMessage(`[NEVERA] ${oppTeam}の手札はすでに3枚以下です。`);
    }
  }

  if (cardId === CARD_ID.PINCHADA) {
    isSpecial = true;
    playSoundSpecial();
    logMessage(`[PINCHADA] ボールがパンクしました！ノーカウントでポイントをやり直します。`);
    state.turnTeam = "NONE"; // 操作をロック
    state.isAnimating = false;
    renderAll();
    setTimeout(resetPoint, 2000);
    return; // ターン終了処理へ進まない
  }

  if (isSpecial) {
    playSoundSpecial();
  } else {
    playSoundPlayCard(cardId);
  }

  triggerHandAnimation(team, 'play');
  renderAll();

  // カードを出したアニメーション（600ms）完了後にドローする
  setTimeout(() => {
    drawCard(team);
    state.justDrawnIndex[team] = state.hands[team].length - 1;
    renderAll();

    // ドローアニメーション（600ms）完了後にターンを終了する
    setTimeout(() => {
      state.justDrawnIndex[team] = null;
      state.isAnimating = false;
      endTurn(team);
    }, 600);
  }, 600);
}

function endTurn(currentTeam) {
  state.turnTeam = currentTeam === "A" ? "B" : "A";

  renderAll(); // ターンが変わった＆フラグがリセットされたことを画面に反映する

  if (state.turnTeam === "B") {
    setTimeout(aiTurn, 1000); // AIにターンを渡す
  }
}

function aiTurn() {
  if (state.turnTeam !== "B") return;

  const cards = state.hands.B;
  let validCards = cards.filter(c => !state.lastCard || state.lastCard === "SERVICIO" || canPlay(c, state.lastCard));

  if (validCards.length === 0) {
    pointTo("A");
    return;
  }

  // ランダムに有効なカードをプレイ
  let bestCard = validCards[Math.floor(Math.random() * validCards.length)];
  playCard(bestCard, "B");
}

// --- Render Functions ---
function renderAll() {
  updateHUD();
  renderHand();
  renderHistory();
}

function updateHUD() {
  document.getElementById("scoreA").textContent = state.score.A;
  document.getElementById("scoreB").textContent = state.score.B;
  document.getElementById("serveIndicator").textContent = `TURN: ${state.turnTeam} | PTS: ${state.totalPoints} | SHOTS: ${state.shotCount}`;
}

function renderHand() {
  const container = document.getElementById("handContainer");
  container.innerHTML = "";

  let hasPlayable = false;
  let renderIndex = 0;

  state.hands.A.forEach((c, index) => {
    const def = getCardDef(c);
    if (!def) return;

    const isCompatible = (state.lastCard === "SERVICIO" || !state.lastCard || canPlay(c, state.lastCard));
    // 自分のターンのときだけプレイ可能
    const isPlayable = isCompatible && state.turnTeam === "A" && !state.isAnimating;
    if (isCompatible) hasPlayable = true;

    // Drawn Highlight
    const isNew = state.justDrawnIndex.A === index;
    const cardEl = document.createElement("div");
    cardEl.className = `card ${!isPlayable ? 'disabled' : ''} ${state.selectedHandIndex === index ? 'selected' : ''} ${isNew ? 'newly-drawn' : ''}`;

    const angle = (renderIndex - 2) * 8;
    const xOffset = (renderIndex - 2) * 45;

    // Set custom CSS properties so that hover states can use them
    cardEl.style.setProperty('--base-x', `${xOffset}px`);
    cardEl.style.setProperty('--base-rotate', `${angle}deg`);

    cardEl.style.zIndex = renderIndex;

    cardEl.innerHTML = `
      <div class="card-cat cat-${def.color}">${def.role}</div>
      <div class="card-title">${def.nameJa}</div>
      <div class="card-effect">${def.descriptionJa}</div>
    `;

    cardEl.onclick = () => {
      if (!isPlayable) {
        playSoundError();
        return;
      }
      if (state.selectedHandIndex === index) {
        playCard(c, "A");
      } else {
        playSoundClick();
        state.selectedHandIndex = index;
        renderHand();
      }
    };

    container.appendChild(cardEl);
    renderIndex++;
  });

  // 手札が5枚未満の場合、空きスロットを作成して隙間を埋める
  const emptySlotsCount = 5 - state.hands.A.length;
  for (let i = 0; i < emptySlotsCount; i++) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "card empty-slot";
    emptyEl.style.cssText = "background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.2); box-shadow: none; cursor: default; pointer-events: none;";

    const angle = (renderIndex - 2) * 8;
    const xOffset = (renderIndex - 2) * 45;
    emptyEl.style.setProperty('--base-x', `${xOffset}px`);
    emptyEl.style.setProperty('--base-rotate', `${angle}deg`);
    emptyEl.style.zIndex = renderIndex;

    container.appendChild(emptyEl);
    renderIndex++;
  }

  const actionContainer = document.getElementById("actionContainer");
  if (actionContainer) {
    actionContainer.innerHTML = "";
    // 自分のターンで、手札に出せるカードがない（が1枚以上ある）場合、失点ボタンを表示
    if (state.turnTeam === "A" && !hasPlayable && state.hands.A.length > 0) {
      const giveUpBtn = document.createElement("button");
      giveUpBtn.textContent = "出せるカードがない (失点)";
      // 横長のフル幅ボタンのスタイルに変更
      giveUpBtn.style.cssText = "width:100%; max-width: 480px; padding:15px; background: linear-gradient(135deg, #e11d48, #be123c); color:#fff; font-size: 16px; font-weight: bold; border:none; border-radius:12px; cursor:pointer; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4); text-shadow: 0 1px 2px rgba(0,0,0,0.5);";
      giveUpBtn.onclick = () => {
        playSoundClick();
        pointTo("B");
      };
      actionContainer.appendChild(giveUpBtn);
    }
  }

  // --- 相手（B）の手札を描画 ---
  const enemyContainer = document.getElementById("enemy-hand-container");
  if (enemyContainer) {
    enemyContainer.innerHTML = "";

    // Bの持っている手札の枚数分だけ裏向きのカードを描画
    let enemyRenderIndex = 0;
    state.hands.B.forEach((_, index) => {
      const isNew = state.justDrawnIndex.B === index;
      const cardEl = document.createElement("div");
      cardEl.className = `card face-down disabled ${isNew ? 'newly-drawn' : ''}`;

      const angle = (enemyRenderIndex - 2) * 8;
      const xOffset = (enemyRenderIndex - 2) * 45;
      cardEl.style.setProperty('--base-x', `${xOffset}px`);
      cardEl.style.setProperty('--base-rotate', `${angle}deg`);
      cardEl.style.zIndex = enemyRenderIndex;

      enemyContainer.appendChild(cardEl);
      enemyRenderIndex++;
    });

    // 5枚に満たない場合は空きスロットを作成
    const emptyEnemySlots = 5 - state.hands.B.length;
    for (let i = 0; i < emptyEnemySlots; i++) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "card empty-slot";
      emptyEl.style.cssText = "background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.1); box-shadow: none; cursor: default; pointer-events: none;";

      const angle = (enemyRenderIndex - 2) * 8;
      const xOffset = (enemyRenderIndex - 2) * 45;
      emptyEl.style.setProperty('--base-x', `${xOffset}px`);
      emptyEl.style.setProperty('--base-rotate', `${angle}deg`);
      emptyEl.style.zIndex = enemyRenderIndex;

      enemyContainer.appendChild(emptyEl);
      enemyRenderIndex++;
    }
  }
}


function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  state.timeline.forEach(t => {
    const el = document.createElement("div");
    const def = getCardDef(t.cardId);
    let color = "#fff";
    if (def) {
      // mapping JS color strings to css hex for history log
      if (def.color === "blue") color = "#5eead4";
      if (def.color === "green") color = "#fde047";
      if (def.color === "red") color = "#ff7eb3";
      if (def.color === "yellow") color = "#c084fc";
    }
    el.style.color = color;
    el.textContent = `${t.team}:${def ? def.nameJa : t.cardId}`;
    list.appendChild(el);
  });

  // 最新の履歴が右端にあるため、常に右端までスクロールさせる
  setTimeout(() => {
    list.scrollLeft = list.scrollWidth;
  }, 10);

  const actionA = document.getElementById("actionA");
  const actionB = document.getElementById("actionB");

  if (!actionA || !actionB) return; // safeguard

  const lastA = [...state.timeline].reverse().find(t => t.team === "A");
  if (lastA && lastA.cardId !== "SERVICIO") {
    const def = getCardDef(lastA.cardId);
    if (def) {
      actionA.innerHTML = `
        <div class="card">
          <div class="card-cat cat-${def.color}">${def.role}</div>
          <div class="card-title">${def.nameJa}</div>
          <div class="card-effect">${def.descriptionJa}</div>
        </div>
      `;
    } else {
      actionA.innerHTML = `<div class="card-name">${lastA.cardId}</div>`;
    }
  } else {
    actionA.innerHTML = '<span style="color:#777">Waiting...</span>';
  }

  const lastB = [...state.timeline].reverse().find(t => t.team === "B");
  if (lastB && lastB.cardId !== "SERVICIO") {
    const def = getCardDef(lastB.cardId);
    if (def) {
      actionB.innerHTML = `
        <div class="card">
          <div class="card-cat cat-${def.color}">${def.role}</div>
          <div class="card-title">${def.nameJa}</div>
          <div class="card-effect">${def.descriptionJa}</div>
        </div>
      `;
    } else {
      actionB.innerHTML = `<div class="card-name">${lastB.cardId}</div>`;
    }
  } else {
    actionB.innerHTML = '<span style="color:#777">Waiting...</span>';
  }
}

function logMessage(msg) {
  const log = document.getElementById("gameLog");
  if (log) log.textContent = msg;
  console.log(msg);
}

// --- Modal / Chart ---
function getColorHex(colorStr) {
  if (colorStr === "blue") return "#5eead4";
  if (colorStr === "green") return "#fde047";
  if (colorStr === "red") return "#ff7eb3";
  if (colorStr === "yellow") return "#c084fc";
  return "#ccc";
}

function generateChart() {
  const container = document.getElementById("chartContainer");
  if (!container) return;

  const cardList = [
    CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO,
    CARD_ID.BLOQUEO, CARD_ID.PASSING, CARD_ID.SALGO,
    CARD_ID.BANDEJA, CARD_ID.VOLEA, CARD_ID.BAJADA, CARD_ID.ENTERRADORA, CARD_ID.REMATE,
    CARD_ID.NEVERA, CARD_ID.PALA_ROTA, CARD_ID.PINCHADA, CARD_ID.RED, CARD_ID.BLANCA
  ];

  let html = '<table><thead><tr><th>出されたカード (場)</th><th>次に出せるカード</th></tr></thead><tbody>';

  cardList.forEach(cid => {
    const currentDef = getCardDef(cid);
    if (!currentDef) return;

    let playableTags = [];
    cardList.forEach(nextId => {
      // 特殊すぎる黄は省略するかREDだけ入れるか。NEVERAを代表として入れておく
      if (canPlay(nextId, cid)) {
        const nextDef = getCardDef(nextId);
        const hex = getColorHex(nextDef.color);
        playableTags.push(`<span class="chart-tag" style="background-color: ${hex}; color: #000;">${nextDef.nameJa}</span>`);
      }
    });

    const cHex = getColorHex(currentDef.color);
    html += `<tr>
      <td style="font-weight:bold; color:${cHex}; white-space:nowrap;">${currentDef.nameJa}</td>
      <td>${playableTags.join(" ")}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// --- Event Listeners ---

document.getElementById("btnShowChart").onclick = () => {
  playSoundClick();
  document.getElementById("chartModal").classList.remove("hidden");
};

document.getElementById("btnCloseChart").onclick = () => {
  playSoundClick();
  document.getElementById("chartModal").classList.add("hidden");
};

document.getElementById("bgmVolume").addEventListener("change", (e) => {
  setBGMVolume(e.target.value);
});

document.getElementById("btnPlayAgain").addEventListener("click", () => {
  playSoundClick();
  location.reload();
});

// BOOT
initGame();
