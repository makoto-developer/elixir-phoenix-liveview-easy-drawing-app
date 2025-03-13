defmodule DrawingAppWeb.CanvasLive do
  use DrawingAppWeb, :live_view
  alias DrawingApp.Canvas
  alias Phoenix.PubSub
  require Logger

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      Logger.info("Subscribing to canvas PubSub channel")
      PubSub.subscribe(DrawingApp.PubSub, "canvas")
    end

    actions = Canvas.get_actions()
    user_id = UUID.uuid4()

    Logger.info("User #{user_id} connected to canvas")

    socket =
      socket
      |> assign(:actions, actions)
      |> assign(:user_id, user_id)
      |> assign(:current_tool, "pen")
      |> assign(:current_color, "#000000")
      |> assign(:brush_size, 5)

    {:ok, socket}
  end

  # 単一アクション追加イベント
  @impl true
  def handle_event("add-action", %{"action" => action}, socket) do
    action = Map.put(action, "user_id", socket.assigns.user_id)
    Logger.info("Received single action: #{inspect(action)}")
    Canvas.add_action(action)

    # アクションはPubSubによって他のクライアントに伝播されるので、
    # 自分自身のソケットにもアクションを追加する
    socket = update(socket, :actions, fn actions -> actions ++ [action] end)

    {:noreply, socket}
  end

  # 複数アクション一括追加イベント
  @impl true
  def handle_event("add-actions", %{"actions" => actions}, socket) do
    user_id = socket.assigns.user_id

    # 各アクションにユーザーIDを追加
    actions_with_user = Enum.map(actions, fn action ->
      Map.put(action, "user_id", user_id)
    end)

    Logger.info("Processing batch of #{length(actions_with_user)} actions from user #{user_id}")

    # 一括でアクションを追加
    Canvas.add_actions(actions_with_user)

    # 自分のソケットにもアクションを追加
    socket = update(socket, :actions, fn existing -> existing ++ actions_with_user end)

    {:noreply, socket}
  end

  @impl true
  def handle_event("clear-canvas", _params, socket) do
    Logger.info("Canvas cleared by user #{socket.assigns.user_id}")
    Canvas.clear_canvas()
    {:noreply, assign(socket, :actions, [])}
  end

  @impl true
  def handle_event("change-tool", %{"tool" => tool}, socket) do
    Logger.info("Tool changed to: #{tool}")
    {:noreply, assign(socket, :current_tool, tool)}
  end

  @impl true
  def handle_event("change-color", %{"color" => color}, socket) do
    Logger.info("Color changed to: #{color}")
    {:noreply, assign(socket, :current_color, color)}
  end

  @impl true
  def handle_event("change-size", %{"size" => size}, socket) do
    {size, _} = Integer.parse(size)
    Logger.info("Brush size changed to: #{size}")
    {:noreply, assign(socket, :brush_size, size)}
  end

  # 単一アクションを受信した時のハンドラー
  @impl true
  def handle_info({:action, action}, socket) do
    # 他のクライアントからのアクションを受信
    user_id = socket.assigns.user_id

    # 自分自身のアクションでなければ処理
    if action["user_id"] != user_id do
      Logger.info("Received broadcast action from user: #{action["user_id"]}")

      # リアルタイム更新: push_eventでフックに直接通知
      socket =
        socket
        |> push_event("new-remote-action", %{action: action})
        |> update(:actions, fn actions -> actions ++ [action] end)

      {:noreply, socket}
    else
      # 自分のアクションは既に追加済みなので無視
      Logger.info("Ignoring own action broadcast")
      {:noreply, socket}
    end
  end

  # 複数アクションをバッチで受信した時のハンドラー
  @impl true
  def handle_info({:actions_batch, actions}, socket) do
    user_id = socket.assigns.user_id

    # 自分以外のユーザーからのアクションのみフィルタリング
    other_user_actions = Enum.filter(actions, fn action ->
      Map.get(action, "user_id") != user_id
    end)

    if length(other_user_actions) > 0 do
      Logger.info("Received #{length(other_user_actions)} actions from batch broadcast")

      # リアルタイム更新: push_eventでフックに直接通知
      socket =
        socket
        |> push_event("new-remote-actions", %{actions: other_user_actions})
        |> update(:actions, fn existing -> existing ++ other_user_actions end)

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  # キャンバスクリアを受信した時のハンドラー
  @impl true
  def handle_info(:clear, socket) do
    Logger.info("Canvas cleared (broadcast)")

    # リアルタイム更新: クリアイベントを直接通知
    socket =
      socket
      |> push_event("canvas-clear", %{})
      |> assign(:actions, [])

    {:noreply, socket}
  end
end