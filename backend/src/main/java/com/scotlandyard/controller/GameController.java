package com.scotlandyard.controller;

import com.scotlandyard.dto.CreateGameRequest;
import com.scotlandyard.dto.GameStateDTO;
import com.scotlandyard.dto.JoinGameRequest;
import com.scotlandyard.dto.RemovePlayerRequest;
import com.scotlandyard.dto.StartGameRequest;
import com.scotlandyard.exception.ConflictException;
import com.scotlandyard.exception.ForbiddenException;
import com.scotlandyard.exception.GameNotFoundException;
import com.scotlandyard.service.GameService;
import org.springframework.http.HttpStatus;
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

    @PostMapping("/create")
    public ResponseEntity<?> createGame(@RequestBody CreateGameRequest req) {
        try {
            GameService.CreateResult result = gameService.createGame(req.getHostName(), req.getMaxPlayers());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("playerId", result.playerId(), "gameState", result.gameState()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinGame(@RequestBody JoinGameRequest req) {
        try {
            GameService.JoinResult result = gameService.joinGame(req.getJoinCode(), req.getPlayerName());
            return ResponseEntity.ok(Map.of("playerId", result.playerId(), "gameState", result.gameState()));
        } catch (GameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (ConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getGame(@PathVariable String id) {
        try {
            GameStateDTO state = gameService.getGame(id);
            return ResponseEntity.ok(state);
        } catch (GameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> startGame(@PathVariable String id, @RequestBody StartGameRequest req) {
        try {
            GameStateDTO state = gameService.startGame(id, req.getPlayerId());
            return ResponseEntity.ok(state);
        } catch (GameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (ConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/players/{targetPlayerId}")
    public ResponseEntity<?> removePlayer(
            @PathVariable String id,
            @PathVariable String targetPlayerId,
            @RequestBody(required = false) RemovePlayerRequest req) {
        try {
            String requesterId = (req != null && req.getRequesterId() != null)
                    ? req.getRequesterId()
                    : targetPlayerId;

            if (requesterId.equals(targetPlayerId)) {
                gameService.leaveGame(id, targetPlayerId);
            } else {
                gameService.kickPlayer(id, requesterId, targetPlayerId);
            }
            return ResponseEntity.noContent().build();
        } catch (GameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (ConflictException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
