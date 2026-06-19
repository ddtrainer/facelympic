export const signalNames = [
  "neutral",
  "smile",
  "boost",
  "browRaise",
  "jawOpen",
  "pucker",
  "mouthSide"
];

export const signalThresholds = {
  neutral: 0.58,
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
    value: name === "neutral" ? 1 : 0,
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
    { name: "neutral", value: neutral, active: neutral > signalThresholds.neutral },
    { name: "smile", value: smile, active: smile >= signalThresholds.smile },
    { name: "boost", value: boost, active: boost >= signalThresholds.boost },
    { name: "browRaise", value: browRaise, active: browRaise >= signalThresholds.browRaise },
    { name: "jawOpen", value: jawOpen, active: jawOpen >= signalThresholds.jawOpen },
    { name: "pucker", value: pucker, active: pucker >= signalThresholds.pucker },
    { name: "mouthSide", value: mouthSide, active: mouthSide >= signalThresholds.mouthSide }
  ];
}

export const signalLabels = {
  neutral: "\uBB34\uD45C\uC815 \uAC77\uAE30",
  smile: "\uC785\uAF2C\uB9AC \uB2EC\uB9AC\uAE30",
  boost: "\uD070 \uC6C3\uC74C \uBD80\uC2A4\uD130",
  browRaise: "\uB208\uC379 \uC810\uD504",
  jawOpen: "\uC785 \uBC8C\uB9AC\uAE30",
  pucker: "\uC785 \uC624\uBBC0\uB9AC\uAE30",
  mouthSide: "\uC785 \uC88C\uC6B0 \uD68C\uD53C"
};

export const signalBlendshapeSources = {
  neutral: ["1 - max(other signals)"],
  smile: ["mouthSmileLeft", "mouthSmileRight"],
  boost: ["mouthSmileLeft", "mouthSmileRight"],
  browRaise: ["browInnerUp", "browOuterUpLeft", "browOuterUpRight"],
  jawOpen: ["jawOpen"],
  pucker: ["mouthPucker"],
  mouthSide: ["mouthLeft", "mouthRight"]
};
