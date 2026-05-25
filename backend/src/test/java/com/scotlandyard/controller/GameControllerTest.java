package com.scotlandyard.controller;

import tools.jackson.databind.ObjectMapper;
import com.scotlandyard.dto.GameStateDTO;
import com.scotlandyard.model.GamePhase;
import com.scotlandyard.model.TurnPhase;
import com.scotlandyard.service.GameService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP layer tests.
 * Verifies request routing, serialisation, and error response shape.
 */
@SpringBootTest
class GameControllerTest {

    @Autowired WebApplicationContext wac;
    @Autowired ObjectMapper json;

    @MockitoBean SimpMessagingTemplate messaging;
    @MockitoBean GameService gameService;

    MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(wac).build();
    }

    // -------------------------------------------------------------------------
    // POST /api/games — create game
    // -------------------------------------------------------------------------

    @Test
    void createGame_validRequest_returns200WithPlayerIdAndGameState() throws Exception {
        var result = new GameService.CreateResult("player-1", lobbyState("game-1"));
        when(gameService.createGame(eq("Alice"), eq(4))).thenReturn(result);

        mvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("hostName", "Alice", "maxPlayers", 4))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerId").value("player-1"))
                .andExpect(jsonPath("$.gameState.phase").value("LOBBY"));
    }

    @Test
    void createGame_serviceThrows_returns400WithErrorField() throws Exception {
        when(gameService.createGame(any(), anyInt()))
                .thenThrow(new IllegalArgumentException("Host name is required"));

        mvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("hostName", "", "maxPlayers", 4))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Host name is required"));
    }

    // -------------------------------------------------------------------------
    // POST /api/games/join — join game
    // -------------------------------------------------------------------------

    @Test
    void joinGame_validRequest_returns200WithPlayerIdAndGameState() throws Exception {
        var result = new GameService.JoinResult("player-2", lobbyState("game-1"));
        when(gameService.joinGame(eq("ABC123"), eq("Bob"))).thenReturn(result);

        mvc.perform(post("/api/games/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("joinCode", "ABC123", "playerName", "Bob"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerId").value("player-2"));
    }

    @Test
    void joinGame_invalidCode_returns400() throws Exception {
        when(gameService.joinGame(any(), any()))
                .thenThrow(new IllegalArgumentException("Game not found"));

        mvc.perform(post("/api/games/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("joinCode", "XXXXXX", "playerName", "Bob"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // GET /api/games/{id} — get game state
    // -------------------------------------------------------------------------

    @Test
    void getGame_knownId_returns200WithGameState() throws Exception {
        when(gameService.getGame("game-1")).thenReturn(lobbyState("game-1"));

        mvc.perform(get("/api/games/game-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameId").value("game-1"))
                .andExpect(jsonPath("$.phase").value("LOBBY"));
    }

    @Test
    void getGame_unknownId_returns400() throws Exception {
        when(gameService.getGame("unknown"))
                .thenThrow(new IllegalArgumentException("Game not found"));

        mvc.perform(get("/api/games/unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // POST /api/games/{id}/start — start game
    // -------------------------------------------------------------------------

    @Test
    void startGame_validHost_returns200WithInProgressState() throws Exception {
        when(gameService.startGame(eq("game-1"), eq("player-1"))).thenReturn(inProgressState("game-1"));

        mvc.perform(post("/api/games/game-1/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("playerId", "player-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phase").value("IN_PROGRESS"));
    }

    @Test
    void startGame_notHost_returns400() throws Exception {
        when(gameService.startGame(any(), any()))
                .thenThrow(new IllegalArgumentException("Only the host can start the game"));

        mvc.perform(post("/api/games/game-1/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("playerId", "wrong-id"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // DELETE /api/games/{id}/players/{playerId} — leave game
    // -------------------------------------------------------------------------

    @Test
    void leaveGame_validPlayer_returns200() throws Exception {
        doNothing().when(gameService).leaveGame("game-1", "player-1");

        mvc.perform(delete("/api/games/game-1/players/player-1"))
                .andExpect(status().isOk());
    }

    @Test
    void leaveGame_unknownPlayer_returns400() throws Exception {
        doThrow(new IllegalArgumentException("Player not in game"))
                .when(gameService).leaveGame(any(), any());

        mvc.perform(delete("/api/games/game-1/players/unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // POST /api/games/{id}/players/{targetId}/kick — kick player
    // -------------------------------------------------------------------------

    @Test
    void kickPlayer_validRequest_returns200() throws Exception {
        doNothing().when(gameService).kickPlayer("game-1", "host-id", "target-id");

        mvc.perform(post("/api/games/game-1/players/target-id/kick")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("hostId", "host-id"))))
                .andExpect(status().isOk());
    }

    @Test
    void kickPlayer_notHost_returns400() throws Exception {
        doThrow(new IllegalArgumentException("Only the host can kick players"))
                .when(gameService).kickPlayer(any(), any(), any());

        mvc.perform(post("/api/games/game-1/players/target-id/kick")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("hostId", "wrong-id"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Only the host can kick players"));
    }

    @Test
    void kickPlayer_selfKick_returns400() throws Exception {
        doThrow(new IllegalArgumentException("Host cannot kick themselves"))
                .when(gameService).kickPlayer(any(), any(), any());

        mvc.perform(post("/api/games/game-1/players/host-id/kick")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("hostId", "host-id"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Host cannot kick themselves"));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private GameStateDTO lobbyState(String gameId) {
        GameStateDTO dto = new GameStateDTO();
        dto.setGameId(gameId);
        dto.setJoinCode("ABC123");
        dto.setPhase(GamePhase.LOBBY);
        dto.setMaxPlayers(4);
        dto.setPlayers(List.of());
        dto.setRound(0);
        return dto;
    }

    private GameStateDTO inProgressState(String gameId) {
        GameStateDTO dto = new GameStateDTO();
        dto.setGameId(gameId);
        dto.setJoinCode("ABC123");
        dto.setPhase(GamePhase.IN_PROGRESS);
        dto.setMaxPlayers(4);
        dto.setPlayers(List.of());
        dto.setRound(1);
        dto.setTurnPhase(TurnPhase.MR_X_TURN);
        return dto;
    }
}
