// --- script.js (このファイル全体を上書きしてください) ---

// --- 定数と変数 ---
const MAX_TAPS = 4;
let tapCount = 0;
let currentVolume = 0.2; 
// 🔴【追加】ボタン移動用のインターバル
let moveInterval = null; 

// タップ回数に対応するゲーム音のメロディパターン（周波数配列）
const GAME_PATTERNS = [
    [220, 262, 330, 220], // Tap 0 (初期): 低く落ち着いた警告音
    [440, 554, 659, 440], // Tap 1: 標準的な緊張感
    [659, 784, 880, 659], // Tap 2: 高い緊急性
    [880, 988, 1109, 988]  // Tap 3: さらに高い音域
];

// DOM Elements for Setting & Countdown (前回のコードから変更なし)
const settingsContainer = document.getElementById('settings-container');
const alarmHoursInput = document.getElementById('alarm-hours');
const alarmMinutesInput = document.getElementById('alarm-minutes');
const setAlarmButton = document.getElementById('set-alarm-button');
const statusMessage = document.getElementById('status-message');
const countdownContainer = document.getElementById('countdown-container');
const countdownDisplay = document.getElementById('countdown-display');
const scheduledTimeDisplay = countdownContainer.querySelector('.scheduled-time');
const soundPatternSelect = document.getElementById('sound-pattern-select'); // HTMLになかったため追加

// DOM Elements for Alarm
const alarmContainer = document.getElementById('alarm-container');
const alarmButton = document.getElementById('alarm-button');
const countDisplay = document.getElementById('tap-count-display');

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// グローバルタイマー変数
let alarmTimer = null;
let countdownInterval = null;
let toneInterval = null;
let initialPatternIndex = 0;

// --- ユーティリティ関数 ---

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}

// --- 音響処理 ---

const masterGainNode = audioCtx.createGain();
masterGainNode.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
masterGainNode.connect(audioCtx.destination);

function playTone(frequency, duration) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gainNode).connect(masterGainNode);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
}

function playPattern(pattern, delay) {
    pattern.forEach((freq, index) => {
        // 🔴【修正点】アラーム音の音量が徐々に上がるように設定
        const startTime = audioCtx.currentTime + index * delay;
        const volumeFactor = 1 + tapCount * 0.2; // タップごとに少し音量を上げる
        masterGainNode.gain.setValueAtTime(Math.min(0.5, currentVolume * volumeFactor), startTime); 
        playTone(freq, delay * 0.95);
    });
}

function startTone() {
    if (toneInterval) clearInterval(toneInterval);
    
    toneInterval = setInterval(() => {
        const pattern = GAME_PATTERNS[Math.min(tapCount, GAME_PATTERNS.length - 1)];
        playPattern(pattern, 0.2); // 0.2秒間隔で音を鳴らす
    }, pattern.length * 0.2 * 1000 + 100); // パターンが鳴り終わってから少し間隔を空ける
}

// --- ボタン移動処理 ---

function moveAlarmButton() {
    // 画面の寸法を取得
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const btnSize = alarmButton.offsetWidth;
    
    // ボタンがはみ出さない範囲でランダムな座標を計算 (10pxのパディングを設ける)
    const maxX = screenWidth - btnSize - 10;
    const maxY = screenHeight - btnSize - 10;
    
    // 🔴【修正点】ランダムな座標を設定
    const newX = Math.floor(Math.random() * maxX) + 10;
    const newY = Math.floor(Math.random() * maxY) + 10;

    // スタイルを適用
    alarmButton.style.left = `${newX}px`;
    alarmButton.style.top = `${newY}px`;
    alarmButton.style.transform = 'translate(0, 0)'; // transformによる中央寄せをリセット
}


// --- アラーム/ゲーム制御 ---

function startGameAlarm() {
    // 画面切り替え
    settingsContainer.style.display = 'none';
    countdownContainer.style.display = 'none';
    alarmContainer.style.display = 'flex';
    
    // 🔴【修正点】背景をずっと赤にする
    document.body.classList.add('alarming-background');

    tapCount = 0;
    countDisplay.textContent = `${tapCount} / ${MAX_TAPS}`;
    
    startTone();
    
    // 🔴【修正点】ボタンの自動移動を開始 (0.5秒ごと)
    if (moveInterval) clearInterval(moveInterval);
    moveInterval = setInterval(moveAlarmButton, 500); 
    
    moveAlarmButton(); // 最初に一度移動させる
}

function stopAlarm() {
    if (toneInterval) clearInterval(toneInterval);
    if (moveInterval) clearInterval(moveInterval); // 🔴【修正点】移動を停止
    
    // 画面をリセット
    document.body.classList.remove('alarming-background');
    alarmContainer.style.display = 'none';
    settingsContainer.style.display = 'block';
    setAlarmButton.disabled = false;
    statusMessage.textContent = "✅ アラームが解除されました。";
}

function handleAlarmTap(e) {
    e.stopPropagation(); // 背景タップによる誤作動を防ぐ
    
    if (tapCount < MAX_TAPS) {
        tapCount++;
        countDisplay.textContent = `${tapCount} / ${MAX_TAPS}`;
        
        // 音色と音量を更新
        startTone();
        
        // ボタンを新しいランダムな位置に移動
        moveAlarmButton();
        
        if (tapCount === MAX_TAPS) {
            stopAlarm();
            alert("⏰ 覚醒完了！アラームを解除しました。");
        }
    }
}

// --- カウントダウン処理 ---

function startCountdown(endTime) {
    // 画面切り替え
    settingsContainer.style.display = 'none';
    alarmContainer.style.display = 'none';
    countdownContainer.style.display = 'block';
    
    scheduledTimeDisplay.textContent = `(${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const remainingTime = endTime.getTime() - new Date().getTime();

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownDisplay.textContent = "00:00:00";
            return;
        }

        countdownDisplay.textContent = formatTime(remainingTime);
    }, 1000);
}


function setAlarmHandler() {
    const hours = parseInt(alarmHoursInput.value) || 0;
    const minutes = parseInt(alarmMinutesInput.value) || 0;
    
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes <= 0) {
        statusMessage.textContent = "⚠️ 0分より長い時間を設定してください。";
        return;
    }
    
    const totalMilliseconds = totalMinutes * 60 * 1000;
    
    if (alarmTimer) clearTimeout(alarmTimer);
    if (countdownInterval) clearInterval(countdownInterval);

    const alarmTime = new Date(new Date().getTime() + totalMilliseconds);

    // 1. カウントダウン表示を開始
    startCountdown(alarmTime);

    // 2. アラームタイマーをセット
    alarmTimer = setTimeout(() => {
        audioCtx.resume(); 
        startGameAlarm();
        clearInterval(countdownInterval); 
    }, totalMilliseconds);

    statusMessage.textContent = "✅ アラームがセットされました。";
    setAlarmButton.disabled = true;
}


// --- イベントリスナー ---

setAlarmButton.addEventListener('click', setAlarmHandler);

// ブラウザの自動再生ポリシーを回避するため、最初のクリックでオーディオコンテキストをアクティブにする
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });

alarmButton.addEventListener('click', handleAlarmTap);

// 初期表示
statusMessage.textContent = "時間を設定して「アラームをセット」を押してください。";