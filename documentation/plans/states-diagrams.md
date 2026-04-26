### Overview

```mermaid
stateDiagram-v2
    direction TB

    [*] --> Idle
    Idle --> Lobby : GameCreated
    Lobby --> MrXTurn : GameStarted
    MrXTurn --> DetectiveTurn : MoveComplete
    DetectiveTurn --> RoundEnd : AllDetectivesMoved
    DetectiveTurn --> DetectivesWin : Caught
    RoundEnd --> MrXTurn : NextRound
    RoundEnd --> MrXWins : Round24Reached
    DetectivesWin --> [*]
    MrXWins --> [*]
```

---

### Mr x states

```mermaid
stateDiagram
    direction TB

    [*] --> CheckingReveal
    CheckingReveal --> Hidden : RoundNotRevealed
    CheckingReveal --> Revealed : RoundRevealed
    Hidden --> AwaitingMove : RevealCheckComplete
    Revealed --> AwaitingMove : RevealCheckComplete
    AwaitingMove --> ValidatingMove : MoveSubmitted
    ValidatingMove --> AwaitingMove : MoveInvalid
    ValidatingMove --> ApplyingSingleMove : MoveValidSingle
    ValidatingMove --> ApplyingDoubleMove : MoveValidDouble
    ApplyingSingleMove --> BroadcastingTransport : MoveApplied
    ApplyingDoubleMove --> AwaitingMove : FirstMoveApplied
    ApplyingDoubleMove --> BroadcastingTransport : SecondMoveApplied
    BroadcastingTransport --> [*] : MoveComplete
```

---

### Detective states

```mermaid
stateDiagram
    direction TB

    [*] --> AwaitingDetMove
    AwaitingDetMove --> ValidatingMove : MoveSubmitted
    AwaitingDetMove --> Skipped : NoValidMoves
    ValidatingMove --> AwaitingDetMove : MoveInvalid
    ValidatingMove --> ApplyingMove : MoveValid
    ApplyingMove --> CheckingCatch : MoveApplied
    CheckingCatch --> DetectivesWin : Caught
    CheckingCatch --> Skipped : NotCaught
    Skipped --> AwaitingDetMove : NextDetective
    Skipped --> [*] : AllDetectivesMoved
    DetectivesWin --> [*]
```

---

### Game state vs Player state

The **game state** is server-authoritative and drives phase transitions (whose turn it is, round number, win conditions). The **player state** is per-connection and tracks whether a client is actively interacting or has gone quiet — a distinction that matters for timeout handling and reconnection logic.

```mermaid
stateDiagram-v2
    direction TB

    state "Game State (server)" as GS {
        [*] --> GS_Idle
        GS_Idle --> GS_Lobby : GameCreated
        GS_Lobby --> GS_InProgress : GameStarted
        GS_InProgress --> GS_Ended : WinConditionMet
        GS_Ended --> [*]
    }

    state "Player State (per client)" as PS {
        [*] --> PS_Disconnected
        PS_Disconnected --> PS_Connected : WebSocketOpen
        PS_Connected --> PS_Active : ActionReceived
        PS_Active --> PS_Idle : NoActionTimeout
        PS_Idle --> PS_Active : ActionReceived
        PS_Idle --> PS_Disconnected : IdleTimeout
        PS_Connected --> PS_Disconnected : WebSocketClose
        PS_Active --> PS_Disconnected : WebSocketClose
    }
```

---

### Player active vs idle

A player transitions to **Idle** after a period of inactivity (no moves, heartbeats, or messages). If idleness persists past a second threshold the server treats the player as disconnected and may pause or forfeit accordingly.

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Active : Connected & in game
    Active --> Idle : NoActivityTimeout (e.g. 30s)
    Idle --> Active : ActivityReceived
    Idle --> Disconnected : IdleTimeout exceeded (e.g. 60s)
    Disconnected --> Active : Reconnected within grace period
    Disconnected --> Forfeited : GracePeriodExpired
    Forfeited --> [*]
```

---

### Timeouts and errors

Key failure modes and where they surface — client-side errors belong in player state; server-side errors belong in game state.

```mermaid
stateDiagram-v2
    direction TB

    state "Client / Player errors" as CE {
        [*] --> CE_WaitingForMove
        CE_WaitingForMove --> CE_MoveTimeout : TurnTimerExpired
        CE_MoveTimeout --> CE_AutoSkip : ServerSkipsPlayer
        CE_AutoSkip --> [*]

        CE_WaitingForMove --> CE_NetworkError : WebSocketError
        CE_NetworkError --> CE_Reconnecting : RetryAttempt
        CE_Reconnecting --> CE_WaitingForMove : ReconnectSuccess
        CE_Reconnecting --> CE_Disconnected : MaxRetriesExceeded
        CE_Disconnected --> [*]
    }

    state "Server / Game errors" as SE {
        [*] --> SE_Running
        SE_Running --> SE_InvalidMove : BadMoveReceived
        SE_InvalidMove --> SE_Running : ErrorSentToClient

        SE_Running --> SE_PlayerMissing : PlayerDisconnected
        SE_PlayerMissing --> SE_Running : PlayerReconnected
        SE_PlayerMissing --> SE_GameAborted : GracePeriodExpired

        SE_Running --> SE_InternalError : UnhandledException
        SE_InternalError --> SE_GameAborted : CannotRecover
        SE_GameAborted --> [*]
    }
```

