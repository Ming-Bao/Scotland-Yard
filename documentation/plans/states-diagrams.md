### Overview

Game-level phases with disconnection handling. A player going missing pauses the game in **Paused**; if they reconnect in time play resumes, otherwise the game aborts.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> Idle
    Idle --> Lobby : GameCreated
    Lobby --> InProgress : GameStarted

    state InProgress {
        [*] --> MrXTurn
        MrXTurn --> DetectiveTurn : MoveComplete
        DetectiveTurn --> RoundEnd : AllDetectivesMoved
        RoundEnd --> MrXTurn : NextRound
    }

    InProgress --> Paused : PlayerDisconnected
    Paused --> InProgress : ReconnectedInTime
    Paused --> GameAborted : GracePeriodExpired

    InProgress --> DetectivesWin : Caught
    InProgress --> MrXWins : Round24Reached

    DetectivesWin --> [*]
    MrXWins --> [*]
    GameAborted --> [*]
```

---

### Mr X states

**AwaitingMove** tracks whether Mr X is actively engaged or idle. A turn timer expiry auto-skips the move server-side. Network errors enter a reconnection loop before either resuming or disconnecting.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> CheckingReveal
    CheckingReveal --> Hidden : RoundNotRevealed
    CheckingReveal --> Revealed : RoundRevealed
    Hidden --> AwaitingMove : RevealCheckComplete
    Revealed --> AwaitingMove : RevealCheckComplete

    state AwaitingMove {
        [*] --> Active
        Active --> Idle : NoActivityTimeout
        Idle --> Active : ActivityReceived
    }

    AwaitingMove --> ValidatingMove : MoveSubmitted
    AwaitingMove --> AutoSkipped : TurnTimerExpired
    AwaitingMove --> Reconnecting : NetworkError
    Reconnecting --> AwaitingMove : ReconnectSuccess
    Reconnecting --> Disconnected : MaxRetriesExceeded
    Disconnected --> [*]

    ValidatingMove --> AwaitingMove : MoveInvalid
    ValidatingMove --> ApplyingSingleMove : MoveValidSingle
    ValidatingMove --> ApplyingDoubleMove : MoveValidDouble
    ApplyingSingleMove --> BroadcastingTransport : MoveApplied
    ApplyingDoubleMove --> AwaitingMove : FirstMoveApplied
    ApplyingDoubleMove --> BroadcastingTransport : SecondMoveApplied
    BroadcastingTransport --> [*] : MoveComplete
    AutoSkipped --> [*] : MoveComplete
```

---

### Detective states

Same active/idle tracking and error paths as Mr X. **AutoSkipped** feeds into the normal **Skipped** path so the turn-rotation logic stays consistent regardless of how a detective's turn ended.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> AwaitingDetMove

    state AwaitingDetMove {
        [*] --> Active
        Active --> Idle : NoActivityTimeout
        Idle --> Active : ActivityReceived
    }

    AwaitingDetMove --> ValidatingMove : MoveSubmitted
    AwaitingDetMove --> Skipped : NoValidMoves
    AwaitingDetMove --> AutoSkipped : TurnTimerExpired
    AwaitingDetMove --> Reconnecting : NetworkError
    Reconnecting --> AwaitingDetMove : ReconnectSuccess
    Reconnecting --> Disconnected : MaxRetriesExceeded
    Disconnected --> [*]

    ValidatingMove --> AwaitingDetMove : MoveInvalid
    ValidatingMove --> ApplyingMove : MoveValid
    ApplyingMove --> CheckingCatch : MoveApplied
    CheckingCatch --> DetectivesWin : Caught
    CheckingCatch --> Skipped : NotCaught
    AutoSkipped --> Skipped : ServerSkipsPlayer
    Skipped --> AwaitingDetMove : NextDetective
    Skipped --> [*] : AllDetectivesMoved
    DetectivesWin --> [*]
```
