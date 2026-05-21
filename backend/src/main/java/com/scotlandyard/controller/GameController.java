package com.scotlandyard.controller;

import com.scotlandyard.dto.CreateGameRequest;
import com.scotlandyard.dto.GameStateDTO;
import com.scotlandyard.dto.JoinGameRequest;
import com.scotlandyard.dto.KickPlayerRequest;
import com.scotlandyard.dto.StartGameRequest;
import com.scotlandyard.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping
    public ResponseEntity<?> createGame(@RequestBody CreateGameRequest req) {
        try {
            GameService.CreateResult result = gameService.createGame(req.getHostName(), req.getMaxPlayers());
            return ResponseEntity.ok(Map.of("playerId", result.playerId(), "gameState", result.gameState()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinGame(@RequestBody JoinGameRequest req) {
        try {
            GameService.JoinResult result = gameService.joinGame(req.getJoinCode(), req.getPlayerName());
            return ResponseEntity.ok(Map.of("playerId", result.playerId(), "gameState", result.gameState()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getGame(@PathVariable String id) {
        try {
            GameStateDTO state = gameService.getGame(id);
            return ResponseEntity.ok(state);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> startGame(@PathVariable String id, @RequestBody StartGameRequest req) {
        try {
            GameStateDTO state = gameService.startGame(id, req.getPlayerId());
            return ResponseEntity.ok(state);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/players/{playerId}")
    public ResponseEntity<?> leaveGame(@PathVariable String id, @PathVariable String playerId) {
        try {
            gameService.leaveGame(id, playerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/players/{targetPlayerId}/kick")
    public ResponseEntity<?> kickPlayer(
            @PathVariable String id,
            @PathVariable String targetPlayerId,
            @RequestBody KickPlayerRequest req) {
        try {
            gameService.kickPlayer(id, req.getHostId(), targetPlayerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
