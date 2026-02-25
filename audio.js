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
}

// Ensure audio context is initialized on first user interaction
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

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

// 2. カードを出す音（Play）パシッ！（テーブルに叩きつけるような打撃音）
export function playSoundPlayCard() {
    // 短く低いアタック音（ドンッ）
    playTone(250, 'square', 0.1, 0.1, 50);
    // 重ねての摩擦ノイズ（シャッ）
    playNoise(0.08, 0.15, 2000, 'bandpass');
    setTimeout(() => playTone(100, 'triangle', 0.05, 0.1, 30), 10);
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
