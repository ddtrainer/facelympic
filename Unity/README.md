# Facelympic Unity 6 — Stage 0

1. Unity Hub에서 이 `Unity` 폴더를 Unity 6으로 엽니다.
2. WebGL Build Support 모듈을 설치합니다.
3. `Facelympic > 0단계 장면 만들기`를 실행합니다.
4. `Facelympic > WebGL 빌드`를 실행합니다.

웹 입력 수신점은 `FaceInputReceiver.OnFaceInputFrame(string json)`입니다. Unity WebGL 페이지는 Facelympic과 같은 출처에서 iframe으로 제공해야 브리지가 얼굴 신호를 전달합니다.
