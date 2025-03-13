# DrawingApp

## Requirements

- asdf
  - elixir
  - erlang

## Installation

```bash
git clone git@github.com/makoto-developer/elixir-phoenix-liveview-easy-drawing-app.git
cd elixir-phoenix-liveview-easy-drawing-app
mix deps.get
mix phx.server
```

## ToDos

- [ ] お絵描きをもっと強化
  - [ ] スタンプボタンは仮実装なので、ブラシの大きさに合わせてスタンプを押せるようにする
  - [ ] レイヤー機能
  - [ ] 自分だけの変更を見れるようにする
  - [ ] 履歴機能(undo, redo)
  - [ ] 相手のペンがどこにあるか見えるようにする
  - [ ] ノート機能(文字を書ける)
  - [ ] ショートカットで切り替えられるようにする
  - [ ] メモリ(5pxごと？とか)の表示、非表示
- [ ] チャット機能を作る
- [ ] 他の機能を作る
  - [ ] アカウント(ゲスト、メールで登録)
  - [ ] ルーム(作成、参加、一覧、削除(作成者、もしくはグループ管理者、もしくは管理者のみ))
  - [ ] チャット機能
- [ ] さらにその先
  - [ ] 書いた線をオブジェクトとして管理して、選択して移動や削除、リサイズ、色をかえる、回転できるようにする
  - [ ] オブジェクトをグループ化して、グループ内での移動や削除、リサイズ、回転できるようにする
  - [ ] 2Core/4GRAMで、10_000TPSくらい捌けるようにチューニング...Elixirなら余裕!
  - [ ] 可用性設計
    - [ ] Elixirクラスター作成
      - [ ] Gigalixir, Heroku, AWS, GCP, Cloudflare Workers, Vercel, さくらVPS, どれかもしくは複数で設定方法を書く
      - [ ] miroで設計図を公開(もしくは自分のポートフォリオサーバで公開もしくはNotion)
      - [ ] Network図
    - [ ] 