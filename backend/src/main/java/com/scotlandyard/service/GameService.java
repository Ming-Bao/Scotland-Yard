package com.scotlandyard.service;

import com.scotlandyard.dto.GameStateDTO;
import com.scotlandyard.dto.PlayerDTO;
import com.scotlandyard.model.*;
import com.scotlandyard.repository.GameRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GameService {

    private static final String JOIN_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int JOIN_CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    @Value("${game.detective-escooter-tickets:10}") private int escooterTickets;
    @Value("${game.detective-bus-tickets:8}")        private int busTickets;
    @Value("${game.detective-train-tickets:4}")      private int trainTickets;
    @Value("${game.detective-ferry-tickets:2}")      private int ferryTickets;

    private final GameRepository gameRepository;
    private final SimpMessagingTemplate messaging;

    public GameService(GameRepository gameRepository, SimpMessagingTemplate messaging) {
        this.gameRepository = gameRepository;
        this.messaging = messaging;
    }

    private void broadcast(GameSession session) {
        messaging.convertAndSend("/topic/games/" + session.getId(), toDTO(session));
    }

    public record CreateResult(String playerId, GameStateDTO gameState) {}
    public record JoinResult(String playerId, GameStateDTO gameState) {}

    public CreateResult createGame(String hostName, int maxPlayers) {
        if (hostName == null || hostName.isBlank())
            throw new IllegalArgumentException("Host name is required");
        if (maxPlayers < 2 || maxPlayers > 6)
            throw new IllegalArgumentException("Max players must be between 2 and 6");

        String gameId   = UUID.randomUUID().toString();
        String playerId = UUID.randomUUID().toString();

        Player host = new LobbyPlayer(playerId, hostName.trim());

        GameSession session = new GameSession();
        session.setId(gameId);
        session.setJoinCode(generateJoinCode());
        session.setPhase(GamePhase.LOBBY);
        session.setMaxPlayers(maxPlayers);
        session.setHostPlayerId(playerId);
        session.getPlayers().add(host);

        gameRepository.save(session);
        return new CreateResult(playerId, toDTO(session));
    }

    public JoinResult joinGame(String joinCode, String playerName) {
        if (joinCode == null || joinCode.isBlank())
            throw new IllegalArgumentException("Join code is required");
        if (playerName == null || playerName.isBlank())
            throw new IllegalArgumentException("Player name is required");

        GameSession session = gameRepository.findByJoinCode(joinCode.toUpperCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        if (session.getPhase() != GamePhase.LOBBY)
            throw new IllegalArgumentException("Game is not in the lobby phase");
        if (session.getPlayers().size() >= session.getMaxPlayers())
            throw new IllegalArgumentException("Game is full");

        String playerId = UUID.randomUUID().toString();
        Player player = new LobbyPlayer(playerId, playerName.trim());
        session.getPlayers().add(player);
        gameRepository.save(session);
        broadcast(session);

        return new JoinResult(playerId, toDTO(session));
    }

    public GameStateDTO startGame(String gameId, String requestingPlayerId) {
        GameSession session = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        if (!requestingPlayerId.equals(session.getHostPlayerId()))
            throw new IllegalArgumentException("Only the host can start the game");
        if (session.getPhase() != GamePhase.LOBBY)
            throw new IllegalArgumentException("Game is not in the lobby phase");
        if (session.getPlayers().size() < 2)
            throw new IllegalArgumentException("Need at least 2 players to start");

        List<Player> lobby = new ArrayList<>(session.getPlayers());
        Collections.shuffle(lobby, random);

        int detectiveCount = lobby.size() - 1;
        List<Player> assigned = new ArrayList<>();

        LobbyPlayer mrXSrc = (LobbyPlayer) lobby.get(0);
        assigned.add(new MrXPlayer(mrXSrc.getId(), mrXSrc.getName(), detectiveCount));

        for (int i = 1; i < lobby.size(); i++) {
            LobbyPlayer d = (LobbyPlayer) lobby.get(i);
            assigned.add(new DetectivePlayer(d.getId(), d.getName(),
                    escooterTickets, busTickets, trainTickets, ferryTickets));
        }

        session.setPlayers(assigned);
        session.setPhase(GamePhase.IN_PROGRESS);
        session.setRound(1);
        session.setTurnPhase(TurnPhase.MR_X_TURN);
        session.setCurrentPlayerId(assigned.get(0).getId());

        gameRepository.save(session);
        broadcast(session);
        return toDTO(session);
    }

    public void leaveGame(String gameId, String playerId) {
        GameSession session = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        Player leavingPlayer = session.getPlayers().stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player not in game"));

        if (session.getPhase() == GamePhase.IN_PROGRESS && leavingPlayer instanceof MrXPlayer) {
            session.setPhase(GamePhase.ENDED);
            session.setAbortReason("Mr. X has left the game");
            session.getPlayers().remove(leavingPlayer);
            gameRepository.save(session);
            broadcast(session);
            return;
        }

        session.getPlayers().remove(leavingPlayer);

        if (session.getPlayers().isEmpty()
                || (session.getPhase() == GamePhase.LOBBY && playerId.equals(session.getHostPlayerId()))) {
            gameRepository.delete(gameId);
            return;
        }

        gameRepository.save(session);
        broadcast(session);
    }

    public void kickPlayer(String gameId, String hostId, String targetPlayerId) {
        GameSession session = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        if (!hostId.equals(session.getHostPlayerId()))
            throw new IllegalArgumentException("Only the host can kick players");
        if (session.getPhase() != GamePhase.LOBBY)
            throw new IllegalArgumentException("Players can only be kicked during the lobby");
        if (hostId.equals(targetPlayerId))
            throw new IllegalArgumentException("Host cannot kick themselves");

        boolean removed = session.getPlayers().removeIf(p -> p.getId().equals(targetPlayerId));
        if (!removed)
            throw new IllegalArgumentException("Player not in game");

        gameRepository.save(session);
        broadcast(session);
    }

    public GameStateDTO getGame(String gameId) {
        GameSession session = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        return toDTO(session);
    }

    private GameStateDTO toDTO(GameSession session) {
        GameStateDTO dto = new GameStateDTO();
        dto.setGameId(session.getId());
        dto.setJoinCode(session.getJoinCode());
        dto.setPhase(session.getPhase());
        dto.setMaxPlayers(session.getMaxPlayers());
        dto.setRound(session.getRound());
        dto.setTurnPhase(session.getTurnPhase());
        dto.setCurrentPlayerId(session.getCurrentPlayerId());
        dto.setWinner(session.getWinner());
        dto.setAbortReason(session.getAbortReason());
        dto.setPlayers(session.getPlayers().stream().map(this::toPlayerDTO).collect(Collectors.toList()));
        return dto;
    }

    private PlayerDTO toPlayerDTO(Player player) {
        PlayerDTO dto = new PlayerDTO();
        dto.setId(player.getId());
        dto.setName(player.getName());
        dto.setRole(player.getRole());
        dto.setNodeId(player.getNodeId());
        dto.setTickets(player.getTickets());
        return dto;
    }

    private String generateJoinCode() {
        StringBuilder sb = new StringBuilder(JOIN_CODE_LENGTH);
        for (int i = 0; i < JOIN_CODE_LENGTH; i++)
            sb.append(JOIN_CODE_CHARS.charAt(random.nextInt(JOIN_CODE_CHARS.length())));
        return sb.toString();
    }
}
