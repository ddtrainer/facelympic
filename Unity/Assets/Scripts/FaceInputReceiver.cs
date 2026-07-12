using System;
using System.Runtime.InteropServices;
using UnityEngine;

public sealed class FaceInputReceiver : MonoBehaviour
{
    [Serializable]
    private sealed class FaceInputFrame
    {
        public long timestampMs;
        public bool faceDetected;
        public float quality;
        public float neutral;
        public float smile;
        public float boost;
        public float browRaise;
        public float headRoll;
        public float jawOpen;
        public float pucker;
    }

    [SerializeField] private Transform runnerRoot;
    [SerializeField] private Transform runnerVisual;
    [SerializeField] private float maximumSpeed = 7f;
    [SerializeField] private float laneWidth = 2.2f;
    [SerializeField] private float trackStart = -4f;
    [SerializeField] private float trackEnd = 22f;
    private FaceInputFrame frame = new FaceInputFrame();
    private float displayedSpeed;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void FacelympicBridgeReady();
#endif

    private void Start()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        FacelympicBridgeReady();
#endif
    }

    public void OnFaceInputFrame(string json)
    {
        if (!string.IsNullOrWhiteSpace(json)) JsonUtility.FromJsonOverwrite(json, frame);
    }

    private void Update()
    {
        if (runnerRoot == null) return;
        float confidence = frame.faceDetected ? Mathf.Clamp01(frame.quality) : 0f;
        float targetSpeed = maximumSpeed * Mathf.Clamp01(frame.smile) * confidence;
        displayedSpeed = Mathf.Lerp(displayedSpeed, targetSpeed, 1f - Mathf.Exp(-6f * Time.deltaTime));

        Vector3 position = runnerRoot.position;
        position.z += displayedSpeed * Time.deltaTime;
        position.x = Mathf.Lerp(position.x, Mathf.Clamp(frame.headRoll, -1f, 1f) * laneWidth, 1f - Mathf.Exp(-7f * Time.deltaTime));
        if (position.z > trackEnd) position.z = trackStart;
        runnerRoot.position = position;

        if (runnerVisual != null)
        {
            float stride = Mathf.Sin(Time.time * (4f + displayedSpeed * 1.8f)) * Mathf.Clamp01(displayedSpeed) * 0.12f;
            runnerVisual.localPosition = new Vector3(0f, stride, 0f);
            runnerVisual.localScale = Vector3.one * Mathf.Lerp(1f, 1.16f, Mathf.Clamp01(frame.boost));
            runnerVisual.localRotation = Quaternion.Euler(0f, 0f, -Mathf.Clamp(frame.headRoll, -1f, 1f) * 10f);
        }
    }

    public void SetRunner(Transform root, Transform visual)
    {
        runnerRoot = root;
        runnerVisual = visual;
    }

}
