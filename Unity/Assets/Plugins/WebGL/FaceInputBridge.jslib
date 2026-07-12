mergeInto(LibraryManager.library, {
  FacelympicBridgeReady: function () {
    if (window.__facelympicBridgeReady) return;
    window.__facelympicBridgeReady = true;
    window.addEventListener("message", function (event) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "facelympic-face-input") return;
      SendMessage("FaceInputReceiver", "OnFaceInputFrame", JSON.stringify(event.data.frame));
    });
    window.parent.postMessage({ type: "facelympic-unity-ready" }, window.location.origin);
  }
});
