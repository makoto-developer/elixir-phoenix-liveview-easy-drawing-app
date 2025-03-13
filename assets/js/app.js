// assets/js/app.js

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import topbar from "../vendor/topbar"
import CanvasHook from "./hooks/canvas"

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  params: {_csrf_token: csrfToken},
  hooks: {
    CanvasHook: CanvasHook
  },
  longPollFallback: false, // WebSocketのみを使用し、フォールバックを無効化
  heartbeatIntervalMs: 10000 // ハートビート間隔を10秒に設定
})

// Show progress bar on live navigation and form submits
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", info => topbar.show())
window.addEventListener("phx:page-loading-end", info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

console.log("Phoenix application started, Canvas Hook:", CanvasHook);

// カスタムイベントリスナーを追加
window.addEventListener("phx:canvas-clear", function() {
  console.log("Canvas clear event received");
});

// LiveView接続状態の表示
document.addEventListener("phx:connected", function() {
  const statusEl = document.getElementById("connection-status");
  if (statusEl) {
    statusEl.textContent = "接続済み";
    statusEl.style.color = "green";
  }
});

document.addEventListener("phx:disconnected", function() {
  const statusEl = document.getElementById("connection-status");
  if (statusEl) {
    statusEl.textContent = "切断されました";
    statusEl.style.color = "red";
  }
});