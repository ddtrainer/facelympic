# Facelympic MVP

Facelympic is a web game prototype where players race a 100m track with facial expressions.

## MVP Scope

- Camera permission flow
- MediaPipe FaceLandmarker integration
- Seven facial signal meters
- Main menu for training, 100m race, and records
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
