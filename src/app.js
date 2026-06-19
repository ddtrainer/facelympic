import { createFaceLandmarker } from "./faceLandmarker.js";
import { calculateFaceSignals, createSignalState, signalLabels } from "./faceSignals.js";

const cameraButton = document.querySelector("#cameraButton");
const cameraPreview = document.querySelector("#cameraPreview");
const cameraPlaceholder = document.querySelector("#cameraPlaceholder");
const cameraStatus = document.querySelector("#cameraStatus");
const modePanel = document.querySelector("#modePanel");
const trainingButton = document.querySelector("#trainingButton");
const raceButton = document.querySelector("#raceButton");
const recordsButton = document.querySelector("#recordsButton");
const signalList = document.querySelector("#signalList");

const modeCopy = {
  training: {
    title: "기초 훈련",
    body: "미소, 큰 웃음, 눈썹, 입 벌리기, 입 오므리기, 좌우 입 움직임을 하나씩 연습합니다."
  },
  race: {
    title: "100m 경기",
    body: "입꼬리를 올려 달리고, 큰 웃음으로 막판 부스터를 씁니다."
  },
  records: {
    title: "기록 보기",
    body: "아직 저장된 기록이 없습니다. 첫 경기를 마치면 최고 기록이 여기에 표시됩니다."
  }
};

let cameraStream = null;
let faceLandmarker = null;
let lastVideoTime = -1;
let animationFrameId = null;

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

function setMode(mode) {
  const copy = modeCopy[mode];

  modePanel.querySelector("h2").textContent = copy.title;
  modePanel.querySelector("p").textContent = copy.body;

  [trainingButton, raceButton, recordsButton].forEach((button) => {
    button.classList.toggle("selected", button.id.toLowerCase().includes(mode));
  });
}

async function requestCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "카메라 미지원";
    modePanel.querySelector("p").textContent = "이 브라우저에서는 카메라 기능을 사용할 수 없습니다.";
    return;
  }

  try {
    cameraStatus.textContent = "권한 요청 중";
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
    cameraStatus.textContent = "인식 엔진 로딩";
    cameraButton.textContent = "카메라 켜짐";
    cameraButton.disabled = true;

    await startFaceDetection();
  } catch (error) {
    cameraStatus.textContent = "권한 필요";
    modePanel.querySelector("p").textContent = "카메라 권한을 허용해야 표정 훈련을 시작할 수 있습니다.";
  }
}

async function startFaceDetection() {
  try {
    faceLandmarker = await createFaceLandmarker();
    cameraStatus.textContent = "얼굴 인식 중";
    detectFaceSignals();
  } catch (error) {
    cameraStatus.textContent = "인식 엔진 오류";
    modePanel.querySelector("p").textContent = "MediaPipe를 불러오지 못했습니다. 인터넷 연결 후 다시 시도하세요.";
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
    renderSignals(calculateFaceSignals(categories));
  }

  animationFrameId = requestAnimationFrame(detectFaceSignals);
}

trainingButton.addEventListener("click", () => setMode("training"));
raceButton.addEventListener("click", () => setMode("race"));
recordsButton.addEventListener("click", () => setMode("records"));
cameraButton.addEventListener("click", requestCamera);

window.addEventListener("beforeunload", () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  cameraStream?.getTracks().forEach((track) => track.stop());
});

renderSignals(createSignalState());
