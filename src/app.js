import { createFaceLandmarker } from "./faceLandmarker.js";
import { calculateFaceSignals, createSignalState, signalLabels } from "./faceSignals.js";

const text = {
  readyTitle: "\uBC14\uB85C \uC2DC\uC791\uD558\uC138\uC694",
  readyBody: "\uCE74\uBA54\uB77C\uB97C \uCF1C\uACE0 \uC785\uAF2C\uB9AC\uB97C \uC62C\uB9AC\uBA74 \uCE90\uB9AD\uD130\uAC00 \uB2EC\uB9BD\uB2C8\uB2E4.",
  cameraOn: "\uCE74\uBA54\uB77C \uCF1C\uAE30",
  cameraReady: "\uC5BC\uAD74 \uC778\uC2DD \uC911",
  cameraLoading: "\uC778\uC2DD \uC5D4\uC9C4 \uB85C\uB529",
  cameraUnsupported: "\uCE74\uBA54\uB77C \uBBF8\uC9C0\uC6D0",
  cameraNeed: "\uAD8C\uD55C \uD544\uC694",
  trainingTitle: "\uAE30\uCD08 \uD6C8\uB828",
  raceTitle: "100m \uACBD\uAE30",
  recordsTitle: "\uAE30\uB85D \uBCF4\uAE30",
  startTraining: "\uD6C8\uB828 \uC2DC\uC791",
  startRace: "\uCD9C\uBC1C!",
  resetRace: "\uB2E4\uC2DC \uB6F0\uAE30",
  noRecords: "\uC544\uC9C1 \uC800\uC7A5\uB41C \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  cameraHelp: "\uBA3C\uC800 \uCE74\uBA54\uB77C\uB97C \uCF1C\uC8FC\uC138\uC694."
};

const trainingSteps = [
  { signal: "neutral", label: "\uBB34\uD45C\uC815", guide: "\uD3B8\uC548\uD55C \uD45C\uC815\uC73C\uB85C \uC815\uBA74\uC744 \uBCF4\uC138\uC694." },
  { signal: "smile", label: "\uC785\uAF2C\uB9AC \uC62C\uB9AC\uAE30", guide: "\uC785\uAF2C\uB9AC\uB97C \uC0B4\uC9DD \uC62C\uB824 \uB2EC\uB9AC\uAE30\uB97C \uC5F0\uC2B5\uD569\uB2C8\uB2E4." },
  { signal: "boost", label: "\uD65C\uC9DD \uC6C3\uAE30", guide: "\uB354 \uD06C\uAC8C \uC6C3\uC5B4 \uBD80\uC2A4\uD130\uB97C \uCF1C\uC138\uC694." },
  { signal: "browRaise", label: "\uB208\uC379 \uC62C\uB9AC\uAE30", guide: "\uB208\uC379\uC744 \uC62C\uB824 \uC810\uD504\uD569\uB2C8\uB2E4." },
  { signal: "jawOpen", label: "\uC785 \uBC8C\uB9AC\uAE30", guide: "\uC544 \uD558\uACE0 \uC785\uC744 \uBC8C\uB824 \uC74C\uC2DD \uBBF8\uC158\uC744 \uC5F0\uC2B5\uD558\uC138\uC694." },
  { signal: "pucker", label: "\uC785 \uC624\uBBC0\uB9AC\uAE30", guide: "\uD6C4 \uD558\uACE0 \uC785\uC744 \uC624\uBBC0\uB824 \uACA9\uD30C\uB97C \uC5F0\uC2B5\uD558\uC138\uC694." },
  { signal: "mouthSide", label: "\uC785 \uC88C\uC6B0", guide: "\uC785\uC744 \uC67C\uCABD\uACFC \uC624\uB978\uCABD\uC73C\uB85C \uC6C0\uC9C1\uC5EC \uD68C\uD53C\uD569\uB2C8\uB2E4." }
];

const cameraButton = document.querySelector("#cameraButton");
const cameraPreview = document.querySelector("#cameraPreview");
const cameraPlaceholder = document.querySelector("#cameraPlaceholder");
const cameraStatus = document.querySelector("#cameraStatus");
const gameStatus = document.querySelector("#gameStatus");
const modePanel = document.querySelector("#modePanel");
const trainingButton = document.querySelector("#trainingButton");
const raceButton = document.querySelector("#raceButton");
const recordsButton = document.querySelector("#recordsButton");
const signalList = document.querySelector("#signalList");
const runnerFace = document.querySelector("#runnerFace");

let cameraStream = null;
let faceLandmarker = null;
let lastVideoTime = -1;
let animationFrameId = null;
let raceFrameId = null;
let currentMode = "home";
let currentSignals = createSignalState();
let trainingIndex = 0;
let trainingHold = 0;
let raceState = createRaceState();

function createRaceState() {
  return {
    active: false,
    startTime: 0,
    distance: 0,
    completedMissions: new Set(),
    finishTime: 0
  };
}

function signalByName(name) {
  return currentSignals.find((signal) => signal.name === name) || { value: 0, active: false };
}

function renderSignals(signals) {
  signalList.innerHTML = signals
    .map((signal) => {
      const percent = Math.round(signal.value * 100);
      const activeClass = signal.active ? " active" : "";

      return `
        <article class="signal-item${activeClass}">
          <div class="signal-header">
            <strong>${signalLabels[signal.name]}</strong>
            <span>${percent}%</span>
          </div>
          <div class="signal-meter">
            <span style="width: ${percent}%"></span>
          </div>
        </article>
      `;
    })
    .join("");
}

function setSelectedButton(mode) {
  const selectedId = `${mode}Button`;
  [trainingButton, raceButton, recordsButton].forEach((button) => {
    button.classList.toggle("selected", button.id === selectedId);
  });
}

function setRunnerDistance(distance) {
  const clampedDistance = Math.max(0, Math.min(100, distance));
  runnerFace.style.left = `${12 + clampedDistance * 0.73}%`;
}

function renderHome() {
  currentMode = "home";
  setSelectedButton("");
  gameStatus.textContent = "\uBB34\uB8CC \uCCB4\uD5D8";
  modePanel.innerHTML = `
    <h2>${text.readyTitle}</h2>
    <p>${text.readyBody}</p>
    <button id="cameraButton" class="camera-button" type="button">${text.cameraOn}</button>
  `;
  modePanel.querySelector("#cameraButton").addEventListener("click", requestCamera);
}

function renderTraining() {
  currentMode = "training";
  setSelectedButton("training");
  gameStatus.textContent = "\uD6C8\uB828 \uB300\uAE30";
  trainingIndex = 0;
  trainingHold = 0;
  modePanel.innerHTML = `
    <h2>${text.trainingTitle}</h2>
    <p>7\uAC1C \uD45C\uC815\uC744 \uD558\uB098\uC529 \uB530\uB77C\uD558\uBA74 \uC131\uACF5 \uD45C\uC2DC\uAC00 \uB728\uB294 \uD6C8\uB828\uC785\uB2C8\uB2E4.</p>
    <div id="trainingCard" class="training-card"></div>
    <button id="startTrainingButton" class="camera-button" type="button">${text.startTraining}</button>
  `;
  modePanel.querySelector("#startTrainingButton").addEventListener("click", () => {
    if (!faceLandmarker) {
      gameStatus.textContent = text.cameraHelp;
      return;
    }
    gameStatus.textContent = "\uD6C8\uB828 \uC911";
    renderTrainingStep();
  });
  renderTrainingStep();
}

function renderTrainingStep() {
  const step = trainingSteps[trainingIndex];
  const progress = Math.min(100, Math.round(trainingHold * 100));
  const card = modePanel.querySelector("#trainingCard");

  if (!card) {
    return;
  }

  if (!step) {
    card.innerHTML = `
      <strong>\uD6C8\uB828 \uC644\uB8CC!</strong>
      <span>\uC774\uC81C 100m \uACBD\uAE30\uB97C \uB20C\uB7EC \uB2EC\uB824\uBCF4\uC138\uC694.</span>
      <div class="progress-bar"><span style="width: 100%"></span></div>
    `;
    gameStatus.textContent = "\uD6C8\uB828 \uC644\uB8CC";
    return;
  }

  card.innerHTML = `
    <strong>${trainingIndex + 1}/7 ${step.label}</strong>
    <span>${step.guide}</span>
    <div class="progress-bar"><span style="width: ${progress}%"></span></div>
  `;
}

function updateTraining() {
  if (currentMode !== "training" || !modePanel.querySelector("#trainingCard")) {
    return;
  }

  const step = trainingSteps[trainingIndex];

  if (!step) {
    return;
  }

  trainingHold = signalByName(step.signal).active ? trainingHold + 0.08 : Math.max(0, trainingHold - 0.04);

  if (trainingHold >= 1) {
    trainingIndex += 1;
    trainingHold = 0;
  }

  renderTrainingStep();
}

function renderRace() {
  currentMode = "race";
  setSelectedButton("race");
  resetRace();
  modePanel.innerHTML = `
    <h2>${text.raceTitle}</h2>
    <p>\uBBF8\uC18C\uB85C \uB2EC\uB9AC\uACE0, \uB208\uC379\uC73C\uB85C \uC810\uD504, \uD070 \uC6C3\uC74C\uC73C\uB85C \uB9C9\uD310 \uBD80\uC2A4\uD130\uB97C \uC4F0\uC138\uC694.</p>
    <div class="race-hud">
      <strong id="distanceText">0m</strong>
      <span id="timeText">0.0s</span>
    </div>
    <div id="missionList" class="mission-list"></div>
    <button id="startRaceButton" class="camera-button" type="button">${text.startRace}</button>
  `;
  modePanel.querySelector("#startRaceButton").addEventListener("click", startRace);
  renderMissions();
}

function resetRace() {
  if (raceFrameId) {
    cancelAnimationFrame(raceFrameId);
  }
  raceState = createRaceState();
  setRunnerDistance(0);
  gameStatus.textContent = "\uACBD\uAE30 \uB300\uAE30";
}

function startRace() {
  if (!faceLandmarker) {
    gameStatus.textContent = text.cameraHelp;
    return;
  }

  raceState = createRaceState();
  raceState.active = true;
  raceState.startTime = performance.now();
  gameStatus.textContent = "\uB2EC\uB9AC\uB294 \uC911";
  modePanel.querySelector("#startRaceButton").textContent = text.resetRace;
  modePanel.querySelector("#startRaceButton").addEventListener("click", renderRace, { once: true });
  raceFrameId = requestAnimationFrame(updateRace);
}

function updateRace(now) {
  if (!raceState.active) {
    return;
  }

  const smile = signalByName("smile");
  const boost = signalByName("boost");
  const speed = 0.11 + smile.value * 0.36 + (boost.active ? 0.22 : 0);
  raceState.distance = Math.min(100, raceState.distance + speed);
  setRunnerDistance(raceState.distance);

  checkRaceMissions();
  renderRaceStats(now);

  if (raceState.distance >= 100) {
    finishRace(now);
    return;
  }

  raceFrameId = requestAnimationFrame(updateRace);
}

function checkRaceMissions() {
  const missions = getRaceMissions();

  missions.forEach((mission) => {
    const inZone = Math.abs(raceState.distance - mission.meter) <= 8;
    if (inZone && signalByName(mission.signal).active) {
      raceState.completedMissions.add(mission.signal);
    }
  });

  renderMissions();
}

function getRaceMissions() {
  return [
    { meter: 25, signal: "browRaise", label: "\uB208\uC379 \uC810\uD504" },
    { meter: 55, signal: "jawOpen", label: "\uC785 \uBC8C\uB9AC\uAE30" },
    { meter: 82, signal: "boost", label: "\uD070 \uC6C3\uC74C \uBD80\uC2A4\uD130" }
  ];
}

function renderRaceStats(now = performance.now()) {
  const distanceText = modePanel.querySelector("#distanceText");
  const timeText = modePanel.querySelector("#timeText");

  if (distanceText) {
    distanceText.textContent = `${Math.floor(raceState.distance)}m`;
  }

  if (timeText && raceState.startTime) {
    timeText.textContent = `${((now - raceState.startTime) / 1000).toFixed(1)}s`;
  }
}

function renderMissions() {
  const missionList = modePanel.querySelector("#missionList");
  if (!missionList) {
    return;
  }

  missionList.innerHTML = getRaceMissions()
    .map((mission) => {
      const done = raceState.completedMissions.has(mission.signal);
      return `<span class="mission-pill${done ? " done" : ""}">${mission.meter}m ${mission.label}</span>`;
    })
    .join("");
}

function finishRace(now) {
  raceState.active = false;
  raceState.finishTime = (now - raceState.startTime) / 1000;
  const missionCount = raceState.completedMissions.size;
  const record = {
    time: Number(raceState.finishTime.toFixed(2)),
    missions: missionCount,
    date: new Date().toLocaleString("ko-KR")
  };

  saveRecord(record);
  gameStatus.textContent = "\uC644\uC8FC \uC644\uB8CC";
  modePanel.querySelector("p").textContent = `${record.time}\uCD08 \uC644\uC8FC, \uBBF8\uC158 ${missionCount}/3\uAC1C \uC131\uACF5`;
  modePanel.querySelector("#startRaceButton").textContent = text.resetRace;
}

function saveRecord(record) {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem("facelympicRecords", JSON.stringify(records.slice(0, 10)));
}

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem("facelympicRecords") || "[]");
  } catch (error) {
    return [];
  }
}

function renderRecords() {
  currentMode = "records";
  setSelectedButton("records");
  gameStatus.textContent = "\uAE30\uB85D \uD655\uC778";
  const records = getRecords();
  const best = records.reduce((bestRecord, record) => {
    if (!bestRecord || record.time < bestRecord.time) {
      return record;
    }
    return bestRecord;
  }, null);

  modePanel.innerHTML = `
    <h2>${text.recordsTitle}</h2>
    <p>${best ? `\uCD5C\uACE0 \uAE30\uB85D: ${best.time}\uCD08, \uBBF8\uC158 ${best.missions}/3\uAC1C` : text.noRecords}</p>
    <div class="record-list">
      ${
        records.length
          ? records.map((record) => `<span>${record.date} · ${record.time}\uCD08 · \uBBF8\uC158 ${record.missions}/3</span>`).join("")
          : `<span>${text.noRecords}</span>`
      }
    </div>
  `;
}

async function requestCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = text.cameraUnsupported;
    modePanel.querySelector("p").textContent = "\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB294 \uCE74\uBA54\uB77C \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
    return;
  }

  try {
    cameraStatus.textContent = "\uAD8C\uD55C \uC694\uCCAD \uC911";
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 960 },
        height: { ideal: 720 }
      },
      audio: false
    });

    cameraPreview.srcObject = cameraStream;
    cameraPreview.classList.add("active");
    cameraPlaceholder.classList.add("hidden");
    cameraStatus.textContent = text.cameraLoading;

    await startFaceDetection();
  } catch (error) {
    cameraStatus.textContent = text.cameraNeed;
    modePanel.querySelector("p").textContent = "\uCE74\uBA54\uB77C \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD574\uC57C \uD45C\uC815 \uD6C8\uB828\uC744 \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
  }
}

async function startFaceDetection() {
  try {
    faceLandmarker = await createFaceLandmarker();
    cameraStatus.textContent = text.cameraReady;
    detectFaceSignals();
  } catch (error) {
    cameraStatus.textContent = "\uC778\uC2DD \uC5D4\uC9C4 \uC624\uB958";
    modePanel.querySelector("p").textContent = "MediaPipe\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC778\uD130\uB137 \uC5F0\uACB0 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.";
  }
}

function detectFaceSignals() {
  if (!faceLandmarker || cameraPreview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    animationFrameId = requestAnimationFrame(detectFaceSignals);
    return;
  }

  if (cameraPreview.currentTime !== lastVideoTime) {
    lastVideoTime = cameraPreview.currentTime;
    const result = faceLandmarker.detectForVideo(cameraPreview, performance.now());
    const categories = result.faceBlendshapes?.[0]?.categories || [];
    currentSignals = calculateFaceSignals(categories);
    renderSignals(currentSignals);
    updateTraining();
  }

  animationFrameId = requestAnimationFrame(detectFaceSignals);
}

trainingButton.addEventListener("click", renderTraining);
raceButton.addEventListener("click", renderRace);
recordsButton.addEventListener("click", renderRecords);

window.addEventListener("beforeunload", () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (raceFrameId) {
    cancelAnimationFrame(raceFrameId);
  }

  cameraStream?.getTracks().forEach((track) => track.stop());
});

renderSignals(currentSignals);
renderHome();
