// assets/js/hooks/canvas.js

const CanvasHook = {
    mounted() {
        this.canvas = document.getElementById("drawing-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.actions = [];

        // スロットリング用の変数
        this.lastSentTime = 0;
        this.pendingActions = [];
        this.throttleTimer = null;

        // キャンバスサイズと初期位置設定
        this.canvasWidth = 2000;
        this.canvasHeight = 2000;
        this.wrapper = document.getElementById("canvas-wrapper");

        // 現在のユーザーID
        this.userId = this.el.dataset.userId;

        // キャンバスを初期化
        this.clearCanvas();

        // キャンバスの中央に表示
        this.centerCanvas();

        // イベントリスナーの設定
        this.setupEventListeners();

        // LiveViewカスタムイベントのハンドラー設定
        this.handleLiveViewEvents();

        // 既存のアクションを読み込み
        const actionsData = document.getElementById("canvas-data");
        if (actionsData) {
            try {
                const actions = JSON.parse(actionsData.dataset.actions);
                console.log("Initial actions loaded:", actions.length);

                if (actions.length > 0) {
                    this.drawActions(actions);
                    this.actions = actions;
                }
            } catch (e) {
                console.error("Error parsing initial actions:", e);
            }
        }

        console.log("Canvas hook mounted successfully");

        // ウィンドウのunload時に保留中のアクションをフラッシュ
        window.addEventListener("beforeunload", () => {
            this.flushPendingActions();
        });
    },

    // LiveViewからのイベントをハンドリングするための設定
    handleLiveViewEvents() {
        // 他ユーザーからの単一アクション受信時
        this.handleEvent("new-remote-action", ({ action }) => {
            console.log("Received realtime remote action:", action);

            // キャンバスに描画
            this.drawAction(action);

            // アクション配列に追加
            this.actions.push(action);
        });

        // 他ユーザーからの複数アクション受信時
        this.handleEvent("new-remote-actions", ({ actions }) => {
            console.log(`Received realtime remote actions: ${actions.length}`);

            // キャンバスに描画
            this.drawActions(actions);

            // 全体のアクション配列に追加
            this.actions = this.actions.concat(actions);
        });

        // キャンバスクリアイベント
        this.handleEvent("canvas-clear", () => {
            console.log("Received canvas clear event");

            // キャンバスをクリア
            this.clearCanvas();

            // アクション配列をリセット
            this.actions = [];
        });
    },

    // キャンバスをクリア
    clearCanvas() {
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    },

    centerCanvas() {
        const wrapperWidth = this.wrapper.clientWidth;
        const wrapperHeight = this.wrapper.clientHeight;

        // スクロール位置を設定
        this.wrapper.scrollLeft = (this.canvasWidth - wrapperWidth) / 2;
        this.wrapper.scrollTop = (this.canvasHeight - wrapperHeight) / 2;
    },

    setupEventListeners() {
        // マウスイベント
        this.canvas.addEventListener("mousedown", this.startDrawing.bind(this));
        document.addEventListener("mousemove", this.draw.bind(this));
        document.addEventListener("mouseup", this.stopDrawing.bind(this));
        document.addEventListener("mouseout", this.stopDrawing.bind(this));

        // タッチデバイス対応
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        document.querySelectorAll('.stamp-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 現在のツールをスタンプに設定
                this.currentStampType = btn.dataset.stampType;
                console.log(`Selected stamp: ${this.currentStampType}`);
            });
        });

        document.addEventListener("touchmove", (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            document.dispatchEvent(mouseEvent);
        });

        document.addEventListener("touchend", (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            const mouseEvent = new MouseEvent("mouseup");
            document.dispatchEvent(mouseEvent);
        });


        // スタンプを使用するためのクリックイベント
        this.canvas.addEventListener('click', (e) => {
            // ツールがスタンプの場合のみ処理
            if (this.el.dataset.tool === 'stamp' && this.currentStampType) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvasWidth / rect.width;
                const scaleY = this.canvasHeight / rect.height;

                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;

                // スタンプを追加
                this.addStamp(x, y, this.currentStampType);
            }
        });
    },

    startDrawing(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.isDrawing = true;

        // キャンバス上の座標を計算 - スケール比率を考慮
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;

        this.lastX = (e.clientX - rect.left) * scaleX;
        this.lastY = (e.clientY - rect.top) * scaleY;

        console.log("Start drawing at:", this.lastX, this.lastY);
    },

    draw(e) {
        if (!this.isDrawing) return;

        // キャンバスの位置を考慮した座標計算
        const rect = this.canvas.getBoundingClientRect();

        // スケール比率を考慮した座標計算
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;

        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        // 座標がキャンバス外の場合は描画しない
        if (isNaN(currentX) || isNaN(currentY) ||
            currentX < 0 || currentY < 0 ||
            currentX > this.canvasWidth || currentY > this.canvasHeight) {
            return;
        }

        // データ属性から現在のツール、色、サイズを取得
        const wrapperEl = document.getElementById("canvas-wrapper");
        const tool = wrapperEl.dataset.tool || "pen";
        const color = wrapperEl.dataset.color || "#000000";
        const size = parseInt(wrapperEl.dataset.size || "5", 10);

        // アクション作成
        const action = {
            type: "draw",
            tool: tool,
            color: tool === "eraser" ? "#FFFFFF" : color,
            size: size,
            fromX: this.lastX,
            fromY: this.lastY,
            toX: currentX,
            toY: currentY,
            timestamp: new Date().getTime(),
            user_id: this.userId // 自分のユーザーIDを追加
        };

        // キャンバスに描画
        this.drawAction(action);

        // アクションリストに追加
        this.actions.push(action);

        // サーバーにアクションを送信
        this.sendActionThrottled(action);

        // 現在の位置を更新
        this.lastX = currentX;
        this.lastY = currentY;
    },

    // 特定のアクションを描画
    drawAction(action) {
        if (!action || !action.type) {
            console.error("Invalid action:", action);
            return;
        }

        try {
            switch(action.type) {
                case "draw":
                    if (!action.fromX || !action.fromY || !action.toX || !action.toY) {
                        console.error("Invalid draw action coordinates:", action);
                        return;
                    }

                    // 状態を保存
                    this.ctx.save();

                    // 線のスタイルを設定
                    this.ctx.strokeStyle = action.color || "#000000";
                    this.ctx.lineWidth = action.size || 5;
                    this.ctx.lineCap = action.tool === "brush" ? "round" : "square";
                    this.ctx.lineJoin = "round";

                    // パスの描画
                    this.ctx.beginPath();
                    this.ctx.moveTo(action.fromX, action.fromY);
                    this.ctx.lineTo(action.toX, action.toY);
                    this.ctx.stroke();

                    // 状態を復元
                    this.ctx.restore();
                    break;

                case "stamp":
                    const img = new Image();
                    img.onload = () => {
                        this.ctx.drawImage(img, action.x - img.width/2, action.y - img.height/2);
                    };
                    img.src = action.stampSrc;
                    break;

                default:
                    console.warn("Unknown action type:", action.type);
            }
        } catch (e) {
            console.error("Error drawing action:", e, action);
        }
    },

    // 複数アクションの描画
    drawActions(actions) {
        actions.forEach(action => this.drawAction(action));
    },

    // スロットリングされたアクション送信
    sendActionThrottled(action) {
        // 初期化
        if (!this.lastSentTime) {
            this.lastSentTime = 0;
            this.pendingActions = [];
        }

        const now = new Date().getTime();
        const throttleInterval = 33; // 30FPSに近い値

        // 保留中のアクションに追加
        this.pendingActions.push(action);

        // 直前のタイマーをクリア
        if (this.throttleTimer) {
            clearTimeout(this.throttleTimer);
            this.throttleTimer = null;
        }

        // 送信のタイミングでなければ待機
        if (now - this.lastSentTime < throttleInterval) {
            // タイマーを設定
            this.throttleTimer = setTimeout(() => {
                this.flushPendingActions();
                this.throttleTimer = null;
            }, throttleInterval - (now - this.lastSentTime));
            return;
        }

        // タイミングが来たので即時送信
        this.flushPendingActions();
    },

    // 保留中のアクションをすべて送信
    flushPendingActions() {
        if (this.pendingActions && this.pendingActions.length > 0) {
            console.log("Sending batch of actions:", this.pendingActions.length);

            // バッチで送信
            const success = this.pushEvent("add-actions", { actions: this.pendingActions });

            if (success) {
                console.log("Successfully sent actions batch");
                this.lastSentTime = new Date().getTime();
                this.pendingActions = [];
            } else {
                console.error("Failed to send actions batch - will retry");
            }
        }
    },

    stopDrawing() {
        if (this.isDrawing) {
            // 描画終了時に未送信のアクションがあれば送信
            this.flushPendingActions();
            this.isDrawing = false;
        }
    },

    // LiveViewから更新を受け取る
    updated() {
        // 新しいアクションがあれば描画
        const newActionsData = document.getElementById("canvas-data");
        if (newActionsData) {
            try {
                const newActions = JSON.parse(newActionsData.dataset.actions);

                // アクション数が変わった場合のみ処理
                if (newActions.length !== this.actions.length) {
                    console.log("Updated actions:", newActions.length);

                    // クリアされた場合
                    if (newActions.length === 0 && this.actions.length > 0) {
                        this.clearCanvas();
                        this.actions = [];
                    }
                    // 新しいアクションがある場合
                    else if (newActions.length > this.actions.length) {
                        const newActionsToAdd = newActions.slice(this.actions.length);
                        this.drawActions(newActionsToAdd);
                        this.actions = newActions;
                    }
                }
            } catch (e) {
                console.error("Error updating actions:", e);
            }
        }
    },

    // スタンプ機能
    addStamp(x, y, stampType) {
        const rect = this.canvas.getBoundingClientRect();

        // スケーリングを考慮した座標
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;

        const canvasX = x * scaleX;
        const canvasY = y * scaleY;

        // スタンプのURLを設定
        const stampSrc = this.getStampSrc(stampType);

        const action = {
            type: "stamp",
            x: canvasX,
            y: canvasY,
            stampType: stampType,
            stampSrc: stampSrc,
            timestamp: new Date().getTime(),
            user_id: this.userId
        };

        // キャンバスに描画
        this.drawAction(action);

        // アクションリストに追加
        this.actions.push(action);

        // サーバーに送信
        this.pushEvent("add-action", { action });
    },

    // スタンプのソースURLを返す関数
    getStampSrc(type) {
        // SVG形式のスタンプURL
        const stamps = {
            "star": "/images/stamps/star.svg",
            "heart": "/images/stamps/heart.svg",
            "smile": "/images/stamps/smile.svg",
            "check": "/images/stamps/check.svg"
        };

        return stamps[type] || stamps["star"];
    }
};

export default CanvasHook;