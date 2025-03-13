defmodule DrawingAppWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :drawing_app

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_drawing_app_key",
    signing_salt: "YOUR_SIGNING_SALT",
    same_site: "Lax"
  ]

  socket "/live", Phoenix.LiveView.Socket,
         websocket: [
           connect_info: [session: @session_options],
           timeout: 45_000,  # タイムアウトを45秒に設定
           max_frame_size: 1_000_000,  # 1MBに設定（デフォルト値よりも大きく）
           compress: true  # 圧縮を有効化
         ]

  # Serve at "/" the static files from "priv/static" directory.
  plug Plug.Static,
       at: "/",
       from: :drawing_app,
       gzip: false,
       only: DrawingAppWeb.static_paths()

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Phoenix.LiveDashboard.RequestLogger,
       param_key: "request_logger",
       cookie_key: "request_logger"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
       parsers: [:urlencoded, :multipart, :json],
       pass: ["*/*"],
       json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options
  plug DrawingAppWeb.Router
end