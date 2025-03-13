defmodule DrawingApp.Canvas do
  use GenServer
  alias Phoenix.PubSub
  require Logger

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get_actions() do
    GenServer.call(__MODULE__, :get_actions)
  end

  def add_action(action) do
    GenServer.cast(__MODULE__, {:add_action, action})
    # PubSubを使用してアクションをブロードキャスト - リアルタイム性のため即時送信
    Logger.info("Broadcasting action to all clients")
    PubSub.broadcast!(DrawingApp.PubSub, "canvas", {:action, action})
  end

  def add_actions(actions) do
    # 複数のアクションをGenServerに一括で追加
    GenServer.cast(__MODULE__, {:add_actions, actions})

    # バッチとしてブロードキャスト - リアルタイム性のため即時送信
    Logger.info("Broadcasting #{length(actions)} actions as batch")
    PubSub.broadcast!(DrawingApp.PubSub, "canvas", {:actions_batch, actions})
  end

  def clear_canvas() do
    GenServer.cast(__MODULE__, :clear_canvas)
    # キャンバスクリアをブロードキャスト - リアルタイム性のため即時送信
    Logger.info("Broadcasting canvas clear to all clients")
    PubSub.broadcast!(DrawingApp.PubSub, "canvas", :clear)
  end

  # Server Callbacks

  @impl true
  def init(_) do
    Logger.info("Canvas GenServer started")
    {:ok, %{actions: []}}
  end

  @impl true
  def handle_call(:get_actions, _from, state) do
    Logger.info("Returning #{length(state.actions)} actions")
    {:reply, state.actions, state}
  end

  @impl true
  def handle_cast({:add_action, action}, state) do
    Logger.info("Adding action to state: #{inspect(action)}")
    {:noreply, %{state | actions: state.actions ++ [action]}}
  end

  @impl true
  def handle_cast({:add_actions, actions}, state) do
    Logger.info("Adding #{length(actions)} actions to state in batch")
    {:noreply, %{state | actions: state.actions ++ actions}}
  end

  @impl true
  def handle_cast(:clear_canvas, state) do
    Logger.info("Clearing canvas state")
    {:noreply, %{state | actions: []}}
  end
end