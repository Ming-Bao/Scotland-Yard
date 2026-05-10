package com.scotlandyard.model;

import java.util.ArrayList;
import java.util.List;

public class GameSession {

    private String id;
    private String joinCode;
    private GamePhase phase;
    private int maxPlayers;
    private String hostPlayerId;
    private List<Player> players = new ArrayList<>();
    private int round;
    private TurnPhase turnPhase;
    private String currentPlayerId;
    private String winner;
    private String abortReason;

    public GameSession() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJoinCode() { return joinCode; }
    public void setJoinCode(String joinCode) { this.joinCode = joinCode; }

    public GamePhase getPhase() { return phase; }
    public void setPhase(GamePhase phase) { this.phase = phase; }

    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }

    public String getHostPlayerId() { return hostPlayerId; }
    public void setHostPlayerId(String hostPlayerId) { this.hostPlayerId = hostPlayerId; }

    public List<Player> getPlayers() { return players; }
    public void setPlayers(List<Player> players) { this.players = players; }

    public int getRound() { return round; }
    public void setRound(int round) { this.round = round; }

    public TurnPhase getTurnPhase() { return turnPhase; }
    public void setTurnPhase(TurnPhase turnPhase) { this.turnPhase = turnPhase; }

    public String getCurrentPlayerId() { return currentPlayerId; }
    public void setCurrentPlayerId(String currentPlayerId) { this.currentPlayerId = currentPlayerId; }

    public String getWinner() { return winner; }
    public void setWinner(String winner) { this.winner = winner; }

    public String getAbortReason() { return abortReason; }
    public void setAbortReason(String abortReason) { this.abortReason = abortReason; }
}
