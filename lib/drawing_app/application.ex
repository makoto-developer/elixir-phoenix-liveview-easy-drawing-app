defmodule DrawingApp.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      DrawingAppWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:drawing_app, :dns_cluster_query) || :ignore},
#      {Phoenix.PubSub, name: DrawingApp.PubSub},
      {Phoenix.PubSub, name: DrawingApp.PubSub, adapter: Phoenix.PubSub.PG2},
      # Start the Finch HTTP client for sending emails
      {Finch, name: DrawingApp.Finch},
      # Start a worker by calling: DrawingApp.Worker.start_link(arg)
      # {DrawingApp.Worker, arg},
      DrawingApp.Canvas,
      DrawingAppWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: DrawingApp.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    DrawingAppWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
