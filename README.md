# Facelympic MVP

Facelympic is a mobile web facial-expression runner with 200m, 500m, and 1000m events.

## MVP Scope

- Camera permission flow
- MediaPipe FaceLandmarker integration
- Six calibrated facial controls with head-roll steering
- Daily seeded tracks and three progressively unlocked events
- Supabase daily world ranking and best records
- JavaScript-to-Unity Web `FaceInputFrame` bridge
- Local static preview server

## Local Preview

```bash
npm run dev
```

Open `http://localhost:5173`.

## Mobile Testing

Use the production HTTPS URL for camera testing on a phone:

```text
https://facelympic.vercel.app
```

Local network URLs printed by `npm run dev` are useful for layout checks on the same Wi-Fi, but mobile browsers usually require HTTPS for camera access.

## Phone diagnostics

Open the production URL with `?debug=1` to show face-detection FPS, normalized signals, and Supabase connection state:

```text
https://facelympic.vercel.app/?debug=1
```

The normal URL does not show the diagnostics overlay. See [PHONE_TEST_GUIDE.md](./PHONE_TEST_GUIDE.md) for the repeatable phone test.

## Unity 6 bridge

The page publishes a normalized `FaceInputFrame` to `window.facelympicUnityBridge`. Open the [`Unity`](./Unity) folder in Unity 6 and use the `Facelympic` editor menu to create and build the Stage 0 cube scene.
