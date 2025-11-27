// ===== DOM ELEMENTS =====
const analyzeBtn = document.getElementById("analyzeBtn");
const moodText = document.getElementById("moodText");
const moodResult = document.getElementById("moodResult");
const suggestionsDiv = document.getElementById("suggestions");

const queueDiv = document.getElementById("queue");
const clearQueueBtn = document.getElementById("clearQueueBtn");

const playTimeInput = document.getElementById("playTime");
const scheduleBtn = document.getElementById("scheduleBtn");
const scheduleStatus = document.getElementById("scheduleStatus");

const addCustomBtn = document.getElementById("addCustomBtn");
const customTitle = document.getElementById("customTitle");
const customUrl = document.getElementById("customUrl");

const nowPlayingTitle = document.getElementById("nowPlayingTitle");
const nowPlayingIndex = document.getElementById("nowPlayingIndex");
const waveEl = document.getElementById("wave");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const volumeSlider = document.getElementById("volumeSlider");

let songQueue = [];
let scheduledTime = null;
let scheduleFired = false;

let ytPlayer = null;
let ytReady = false;
let currentIndex = -1;

// ===== LOCAL STORAGE =====
function loadQueue() {
  const s = localStorage.getItem("songQueue");
  if (s) songQueue = JSON.parse(s);
}
function saveQueue() {
  localStorage.setItem("songQueue", JSON.stringify(songQueue));
}

// ===== UI =====
function updateNowPlaying() {
  if (currentIndex < 0 || currentIndex >= songQueue.length) {
    nowPlayingTitle.textContent = "No song";
    nowPlayingIndex.textContent = "Queue empty";
    return;
  }
  nowPlayingTitle.textContent = songQueue[currentIndex].title;
  nowPlayingIndex.textContent = `Song ${currentIndex + 1} of ${songQueue.length}`;
}

function setWavePlaying(b) {
  b ? waveEl.classList.add("playing") : waveEl.classList.remove("playing");
}

// ===== RENDER QUEUE =====
function renderQueue() {
  queueDiv.innerHTML = "";

  if (songQueue.length === 0) {
    queueDiv.textContent = "No songs yet.";
    queueDiv.classList.add("empty-state");
    return;
  }

  queueDiv.classList.remove("empty-state");

  songQueue.forEach((song, idx) => {
    const div = document.createElement("div");
    div.className = "queue-item";

    div.innerHTML = `
      <div class="queue-item-header">
        <div class="queue-item-title">${song.title}</div>
        <span class="pill pill-soft">#${idx+1}</span>
      </div>
      <div class="queue-item-url">${song.url}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "queue-actions";

    const playBtn2 = document.createElement("button");
    playBtn2.className = "btn-small btn-outline";
    playBtn2.textContent = "Play";
    playBtn2.onclick = () => playSong(idx);

    const rm = document.createElement("button");
    rm.className = "btn-small btn-danger";
    rm.textContent = "Remove";
    rm.onclick = () => {
      songQueue.splice(idx,1);
      saveQueue();
      renderQueue();
    };

    btns.appendChild(playBtn2);
    btns.appendChild(rm);
    div.appendChild(btns);

    queueDiv.appendChild(div);
  });
}

// ===== YOUTUBE API =====
function extractYT(url) {
  if (url.includes("youtu.be/"))
    return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("youtube.com/watch"))
    return new URL(url).searchParams.get("v");
  return null;
}

function playSong(i) {
  if (i < 0 || i >= songQueue.length) return;

  currentIndex = i;
  updateNowPlaying();

  const id = extractYT(songQueue[i].url);
  if (id && ytReady)
    ytPlayer.loadVideoById(id);
  setWavePlaying(true);
}

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("player", {
    height: "0",
    width: "0",
    videoId: "",
    playerVars: { autoplay: 1 },
    events: {
      onReady: () => { ytReady = true; },
      onStateChange: ev => {
        if (ev.data === 1) setWavePlaying(true);
        if (ev.data === 2) setWavePlaying(false);
        if (ev.data === 0) {
          currentIndex = (currentIndex + 1) % songQueue.length;
          playSong(currentIndex);
        }
      }
    }
  });
};

// ===== MOOD ANALYSIS =====
analyzeBtn.onclick = async () => {
  const text = moodText.value.trim();
  if (!text) return alert("Enter mood");

  moodResult.textContent = "Analyzing...";

  const res = await fetch("/api/predict_mood", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text})
  });

  const data = await res.json();
  if (!data.songs) return;

  moodResult.innerHTML = `Mood: <b>${data.mood}</b>`;
  suggestionsDiv.innerHTML = "";

  data.songs.forEach(s => {
    const x = document.createElement("div");
    x.className = "queue-item";
    x.innerHTML = `
      <div class="queue-item-title">${s.title}</div>
      <div class="queue-item-url">${s.url}</div>
    `;

    const b = document.createElement("button");
    b.className = "btn-small btn-primary";
    b.textContent = "Add";
    b.onclick = () => {
      songQueue.push(s);
      saveQueue();
      renderQueue();
    };

    x.appendChild(b);
    suggestionsDiv.appendChild(x);
  });
};

// ===== CUSTOM SONG =====
addCustomBtn.onclick = () => {
  const title = customTitle.value.trim();
  const url = customUrl.value.trim();
  if (!title || !url) return;

  songQueue.push({title,url});
  customTitle.value = "";
  customUrl.value = "";
  saveQueue();
  renderQueue();
};

// ===== PLAYER BUTTONS =====
playBtn.onclick = () => {
  if (currentIndex === -1 && songQueue.length > 0)
    currentIndex = 0;
  playSong(currentIndex);
};

pauseBtn.onclick = () => ytPlayer.pauseVideo();
nextBtn.onclick = () => playSong((currentIndex+1)%songQueue.length);
prevBtn.onclick = () => playSong((currentIndex-1+songQueue.length)%songQueue.length);

// ===== VOLUME =====
volumeSlider.oninput = () => ytPlayer.setVolume(volumeSlider.value);

// ===== CLEAR QUEUE =====
clearQueueBtn.onclick = () => {
  if (confirm("Clear queue?")) {
    songQueue = [];
    saveQueue();
    renderQueue();
  }
};

// ===== SCHEDULE =====
scheduleBtn.onclick = () => {
  const t = playTimeInput.value;
  if (!t) return alert("Select time");
  if (!songQueue.length) return alert("Queue empty");

  scheduledTime = t;
  scheduleStatus.textContent = "Scheduled for " + t;
};

setInterval(() => {
  if (!scheduledTime || scheduleFired) return;

  let d = new Date();
  let h = String(d.getHours()).padStart(2,"0");
  let m = String(d.getMinutes()).padStart(2,"0");

  if (`${h}:${m}` === scheduledTime) {
    scheduleFired = true;
    playSong(0);
    scheduleStatus.textContent = "Playing queue...";
  }
}, 1000);

// ===== INIT =====
loadQueue();
renderQueue();
