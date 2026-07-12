mergeInto(LibraryManager.library, {
  FacelympicBridgeReady: function () {
    // The host registers a same-page Unity instance directly. The message
    // bridge is only needed when this build is embedded in an iframe.
    if (window.parent === window) return;
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
