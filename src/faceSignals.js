const signalNames = [
  "neutral",
  "smile",
  "boost",
  "browRaise",
  "jawOpen",
  "pucker",
  "mouthSide"
];

const thresholds = {
  smile: 0.32,
  boost: 0.62,
  browRaise: 0.36,
  jawOpen: 0.42,
  pucker: 0.38,
  mouthSide: 0.28
};

function valueOf(scores, name) {
  return scores.get(name) || 0;
}

function average(...values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function createSignalState() {
  return signalNames.map((name) => ({
    name,
    value: 0,
    active: name === "neutral"
  }));
}

export function calculateFaceSignals(categories = []) {
  const scores = new Map(categories.map((category) => [category.categoryName, category.score]));

  const smile = average(valueOf(scores, "mouthSmileLeft"), valueOf(scores, "mouthSmileRight"));
  const browRaise = Math.max(
    valueOf(scores, "browInnerUp"),
    valueOf(scores, "browOuterUpLeft"),
    valueOf(scores, "browOuterUpRight")
  );
  const jawOpen = valueOf(scores, "jawOpen");
  const pucker = valueOf(scores, "mouthPucker");
  const mouthSide = Math.max(valueOf(scores, "mouthLeft"), valueOf(scores, "mouthRight"));
  const boost = smile;
  const neutral = Math.max(0, 1 - Math.max(smile, browRaise, jawOpen, pucker, mouthSide));

  return [
    { name: "neutral", value: neutral, active: neutral > 0.58 },
    { name: "smile", value: smile, active: smile >= thresholds.smile },
    { name: "boost", value: boost, active: boost >= thresholds.boost },
    { name: "browRaise", value: browRaise, active: browRaise >= thresholds.browRaise },
    { name: "jawOpen", value: jawOpen, active: jawOpen >= thresholds.jawOpen },
    { name: "pucker", value: pucker, active: pucker >= thresholds.pucker },
    { name: "mouthSide", value: mouthSide, active: mouthSide >= thresholds.mouthSide }
  ];
}

export const signalLabels = {
  neutral: "무표정 걷기",
  smile: "입꼬리 달리기",
  boost: "큰 웃음 부스터",
  browRaise: "눈썹 점프",
  jawOpen: "입 벌리기",
  pucker: "입 오므리기",
  mouthSide: "입 좌우 회피"
};
