// Simple Web Audio API Synthesizer for game sound effects
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    playRandomBGM();
}

// Ensure audio context is initialized on first user interaction
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

// --- BGM Logic ---
let isBGMPlaying = false;
let currentBGM = null;
const BGM_LIST = [
    "bgm_chance1.mp3", "bgm_chance2.mp3", "bgm_chance3.mp3", "bgm_chance4.mp3", "bgm_chance5.mp3",
    "bgm_main.mp3", "bgm_main10.mp3", "bgm_main11.mp3", "bgm_main12.mp3", "bgm_main13.mp3",
    "bgm_main14.mp3", "bgm_main15.mp3", "bgm_main16.mp3", "bgm_main17.mp3", "bgm_main18.mp3",
    "bgm_main19.mp3", "bgm_main2.mp3", "bgm_main20.mp3", "bgm_main21.mp3", "bgm_main22.mp3",
    "bgm_main23.mp3", "bgm_main24.mp3", "bgm_main25.mp3", "bgm_main26.mp3", "bgm_main27.mp3",
    "bgm_main28.mp3", "bgm_main29.mp3", "bgm_main3.mp3", "bgm_main30.mp3", "bgm_main31.mp3",
    "bgm_main4.mp3", "bgm_main5.mp3", "bgm_main6.mp3", "bgm_main7.mp3", "bgm_main8.mp3",
    "bgm_main9.mp3", "bgm_pinch1.mp3", "bgm_pinch2.mp3", "bgm_pinch3.mp3", "bgm_pinch4.mp3",
    "bgm_pinch5.mp3"
];

let bgmVolumeValue = 0.25; // default med
let bgmBufferSource = null;
let bgmGainNode = null;
let currentBGMBuffer = null;
let isBGMLoading = false;

export function setBGMVolume(mode) {
    switch (mode) {
        case "high": bgmVolumeValue = 0.8; break;
        case "med": bgmVolumeValue = 0.25; break;
        case "low": bgmVolumeValue = 0.05; break;
        case "off": bgmVolumeValue = 0; break;
        default: bgmVolumeValue = 0.25;
    }

    if (bgmGainNode) {
        // iOSでも確実に音量が変わるよう、Web Audio APIのGainNodeを使用
        bgmGainNode.gain.setTargetAtTime(bgmVolumeValue, audioCtx.currentTime, 0.1);
    }

    if (bgmVolumeValue > 0 && !isBGMPlaying && !isBGMLoading) {
        if (currentBGMBuffer) {
            playBGMBuffer();
        } else {
            playRandomBGM();
        }
    } else if (bgmVolumeValue === 0 && isBGMPlaying) {
        if (bgmBufferSource) {
            try { bgmBufferSource.stop(); } catch (e) { }
            bgmBufferSource.disconnect();
            bgmBufferSource = null;
            isBGMPlaying = false;
        }
    }
}

function playRandomBGM() {
    if (isBGMPlaying || bgmVolumeValue === 0 || isBGMLoading) return;

    if (currentBGMBuffer) {
        playBGMBuffer();
        return;
    }

    isBGMLoading = true;
    const rc = Math.floor(Math.random() * BGM_LIST.length);
    fetch(`assets/audio/BGM/${BGM_LIST[rc]}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
        .then(decodedBuf => {
            currentBGMBuffer = decodedBuf;
            isBGMLoading = false;
            if (bgmVolumeValue > 0) playBGMBuffer();
        })
        .catch(e => {
            console.warn("BGM Playback Failed: ", e);
            isBGMLoading = false;
        });
}

function playBGMBuffer() {
    if (!audioCtx || !currentBGMBuffer) return;

    if (bgmBufferSource) {
        try { bgmBufferSource.stop(); } catch (e) { }
        bgmBufferSource.disconnect();
    }

    if (!bgmGainNode) {
        bgmGainNode = audioCtx.createGain();
        bgmGainNode.connect(audioCtx.destination);
    }

    bgmBufferSource = audioCtx.createBufferSource();
    bgmBufferSource.buffer = currentBGMBuffer;
    bgmBufferSource.loop = true;
    bgmGainNode.gain.setValueAtTime(bgmVolumeValue, audioCtx.currentTime);

    bgmBufferSource.connect(bgmGainNode);
    bgmBufferSource.start(0);
    isBGMPlaying = true;
}

function playTone(freq, type, duration, vol = 0.1, slideFreq = null) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    }

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// --- Noise/Friction Synthesizer for Paper Sounds ---
function playNoise(duration, vol = 0.1, filterFreq = 1000, filterType = 'highpass') {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start();
}

// 1. カードを引く音（Draw）シュッ（紙が擦れるような摩擦音）
export function playSoundDraw() {
    playNoise(0.12, 0.06, 800, 'highpass');
    playTone(600, 'triangle', 0.1, 0.02, 900);
}

// --- 音源ファイルキャッシュ ---
const audioCache = {};
function playFileSE(filename) {
    if (!audioCache[filename]) {
        audioCache[filename] = new Audio(`assets/audio/SE/${filename}`);
    }
    const a = audioCache[filename].cloneNode();
    a.volume = 0.4;
    a.play().catch(e => console.warn("Audio play failed: ", e));
}

// 2. カードを出す音（Play）パシッ！（種類に応じてSEを変更）
export function playSoundPlayCard(cardId = null) {
    // カードIDごとの音源マッピング
    const SE_MAP = {
        "GOLPE_DEFENSIVO": "se_hit_stroke.mp3",
        "GLOBO": "se_hit_drop.mp3",
        "SOY_UN_MURO": "se_hit_rebote.mp3",
        "BLOQUEO": "se_hit_cut.mp3",
        "PASSING": "se_passing.mp3",
        "SALGO_POR_LA_PUERTA": "se_passing.mp3",
        "BANDEJA": "se_hit_bandeja.mp3",
        "VOLEA": "se_hit_volley.mp3",
        "BAJADA_DE_PARED": "se_hit_rebote.mp3",
        "ENTERRADORA": "se_hit_remate.mp3",
        "REMATE_X3": "se_hit_remate.mp3"
    };

    if (cardId && SE_MAP[cardId]) {
        playFileSE(SE_MAP[cardId]);
    } else {
        // デフォルト/フォールバックサウンド（ストローク）
        playFileSE("se_hit_stroke.mp3");
    }
}

// 3. エラー音 / 出せない音（Error）ポプッ
export function playSoundError() {
    playTone(150, 'sawtooth', 0.2, 0.1, 100);
}

// 4. 失点 / ポイント負け（Lose）
export function playSoundLose() {
    playTone(300, 'sawtooth', 0.3, 0.1, 100);
    setTimeout(() => playTone(250, 'sawtooth', 0.4, 0.1, 80), 300);
}

// 5. 得点 / ポイント勝ち（Win/Point）ピンポーン
export function playSoundPoint() {
    playTone(600, 'sine', 0.2, 0.1);
    setTimeout(() => playTone(800, 'sine', 0.4, 0.1), 150);
}

// 6. UIクリック音（相性表など）カチッ
export function playSoundClick() {
    playTone(1000, 'sine', 0.05, 0.03);
}

// 7. 特殊効果（ネベラ、パンクなど）キラン・ドーン
export function playSoundSpecial() {
    playTone(400, 'square', 0.5, 0.05, 1200);
    setTimeout(() => playTone(800, 'sine', 0.4, 0.05, 200), 200);
}

// 8. 試合終了 / 勝利チャイム
export function playSoundMatchWin() {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'sine', 0.4, 0.1), idx * 150);
    });
}
