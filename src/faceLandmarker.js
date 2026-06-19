const visionPackageUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs";
const wasmRootUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

export async function createFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import(visionPackageUrl);
  const filesetResolver = await FilesetResolver.forVisionTasks(wasmRootUrl);

  const options = {
    baseOptions: {
      modelAssetPath: modelUrl,
      delegate: "GPU"
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 1
  };

  try {
    return await FaceLandmarker.createFromOptions(filesetResolver, options);
  } catch (error) {
    return FaceLandmarker.createFromOptions(filesetResolver, {
      ...options,
      baseOptions: {
        modelAssetPath: modelUrl,
        delegate: "CPU"
      }
    });
  }
}
