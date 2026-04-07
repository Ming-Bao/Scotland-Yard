### Overall High level states


``` mermaid
stateDiagram-v2
    direction TB

    [*] --> Lobby
    Lobby --> Setup : all players ready
    Setup --> MrXTurn

    state MrXTurn {
        [*] --> SelectMove
        SelectMove --> ValidateTicket : node chosen
        ValidateTicket --> SubmitMove : ticket available
        ValidateTicket --> SelectMove : no ticket
        SubmitMove --> LogTransport
        LogTransport --> [*]
    }

    state DetTurn {
        [*] --> NextDetective
        NextDetective --> DetSelectMove
        DetSelectMove --> DetValidateTicket : node chosen
        DetValidateTicket --> DetSubmitMove : ticket ok
        DetValidateTicket --> DetSelectMove : no ticket / blocked
        DetSubmitMove --> CatchCheck
        
        CatchCheck --> NextDetective : more detectives
        CatchCheck --> RoundEnd : all moved
        
        RoundEnd --> TurnCheck
        TurnCheck --> NextDetective : round 24 not reached
    }

    MrXTurn --> RevealCheck : move logged
    RevealCheck --> DetTurn : hidden
    RevealCheck --> DetTurn : reveal
    
    TurnCheck --> MrXWins : round 24 reached
	CatchCheck --> DetectivesWin : on Mr. X node
    DetectivesWin --> [*]
    MrXWins --> [*]
```

---

### Mr X states

``` mermaid
flowchart TD
    A([Mr. X turn starts]) --> R{Reveal round?\nrounds 3,8,13,18,24}
    R -- yes --> RA[POST\nbroadcast node to detectives]
    R -- no --> B
    RA --> B[GET \nfetch valid moves]
    B --> C{API response ok?}
    C -- error --> B2[Show error, retry]
    B2 --> B
    C -- ok --> D[Render reachable nodes on map]
    D --> E[Mr. X selects node]
    E --> F{Ticket check}
    F -- taxi available --> G1[Use taxi ticket]
    F -- bus available --> G2[Use bus ticket]
    F -- underground available --> G3[Use underground ticket]
    F -- black ticket available --> G4[Use black ticket]
    F -- double ticket --> G5[Use double ticket\nplay two moves this turn]
    G1 & G2 & G3 & G4 & G5 --> I[POST /game/move\nbody: node_id, transport]
    I --> J{Server validates}
    J -- invalid move --> E
    J -- valid --> N[Decrement ticket in server state]
    N --> O([Advance to Detective turn])

```

---

### Detective states

``` mermaid
flowchart TD
    A([Detective turn starts]) --> A1[GET /game/detectives\nfetch all positions]
    A1 --> B[wait for backend signal]
    B --> D{Has valid moves?}
    D -- no moves / no tickets --> E[Detective skips]
    D -- moves available --> F[Highlight reachable nodes on map]
    F --> G[Detective selects node]
    G --> H{Ticket check}
    H -- taxi --> I1[Use taxi]
    H -- bus --> I2[Use bus]
    H -- underground --> I3[Use underground]
    H -- no valid ticket --> G
    I1 & I2 & I3 --> J[POST /game/move\nbody: player_id, node_id, transport]
    J --> K{Catch check\nserver-side}
    K -- detective node == Mr. X node --> L[POST /game/caught\nbroadcast win]
    L --> M([Detectives win!])
    K -- no catch --> N{Turn check\nhas all detectives gone?}
    E --> N
    N -- no: next detective --> B
    N -- yes --> O[increment round]
    O --> P{Round limit check}
    P -- round == 24 --> Q([Mr. X wins!])
    P -- round < 24 --> R([Next Mr. X turn])
  
```
