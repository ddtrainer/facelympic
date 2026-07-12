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

    [SerializeField] private Transform runnerCube;
    [SerializeField] private float minimumSpeed = 35f;
    [SerializeField] private float smileSpeed = 260f;
    [SerializeField] private float rollAngle = 18f;
    private FaceInputFrame frame = new FaceInputFrame();

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
        if (runnerCube == null) return;
        float confidence = frame.faceDetected ? Mathf.Clamp01(frame.quality) : 0f;
        float speed = (minimumSpeed + smileSpeed * Mathf.Clamp01(frame.smile)) * confidence;
        runnerCube.Rotate(Vector3.up, speed * Time.deltaTime, Space.Self);
        Vector3 euler = runnerCube.localEulerAngles;
        runnerCube.localRotation = Quaternion.Euler(0f, euler.y, -Mathf.Clamp(frame.headRoll, -1f, 1f) * rollAngle);
        runnerCube.localScale = Vector3.one * Mathf.Lerp(1f, 1.18f, Mathf.Clamp01(frame.boost));
    }

    public void SetRunnerCube(Transform target) { runnerCube = target; }
}
