package com.scotlandyard.service;

import com.scotlandyard.dto.GameStateDTO;
import com.scotlandyard.dto.PlayerDTO;
import com.scotlandyard.model.GamePhase;
import com.scotlandyard.model.GameSession;
import com.scotlandyard.model.Player;
import com.scotlandyard.repository.GameRepository;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GameService {

    private static final String JOIN_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int JOIN_CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    private final GameRepository gameRepository;

    public GameService(GameRepository gameRepository) {
        this.gameRepository = gameRepository;
    }

    public record CreateResult(String playerId, GameStateDTO gameState) {}
    public record JoinResult(String playerId, GameStateDTO gameState) {}

    public CreateResult createGame(String hostName, int maxPlayers) {
        if (hostName == null || hostName.isBlank()) {
            throw new IllegalArgumentException("Host name is required");
        }
        if (maxPlayers < 2 || maxPlayers > 6) {
            throw new IllegalArgumentException("Max players must be between 2 and 6");
        }

        String gameId = UUID.randomUUID().toString();
        String playerId = UUID.randomUUID().toString();

        Player host = new Player(playerId, hostName.trim());

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
        if (joinCode == null || joinCode.isBlank()) {
            throw new IllegalArgumentException("Join code is required");
        }
        if (playerName == null || playerName.isBlank()) {
            throw new IllegalArgumentException("Player name is required");
        }

        GameSession session = gameRepository.findByJoinCode(joinCode.toUpperCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        if (session.getPhase() != GamePhase.LOBBY) {
            throw new IllegalArgumentException("Game is not in the lobby phase");
        }
        if (session.getPlayers().size() >= session.getMaxPlayers()) {
            throw new IllegalArgumentException("Game is full");
        }

        String playerId = UUID.randomUUID().toString();
        Player player = new Player(playerId, playerName.trim());
        session.getPlayers().add(player);
        gameRepository.save(session);

        return new JoinResult(playerId, toDTO(session));
    }

    public GameStateDTO startGame(String gameId, String requestingPlayerId) {
        GameSession session = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        if (!requestingPlayerId.equals(session.getHostPlayerId())) {
            throw new IllegalArgumentException("Only the host can start the game");
        }
        if (session.getPhase() != GamePhase.LOBBY) {
            throw new IllegalArgumentException("Game is not in the lobby phase");
        }
        if (session.getPlayers().size() < 2) {
            throw new IllegalArgumentException("Need at least 2 players to start");
        }

        session.setPhase(GamePhase.IN_PROGRESS);
        gameRepository.save(session);
        return toDTO(session);
    }

    public void leaveGame(String gameId, String playerId) {
        GameSession session = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        Player leavingPlayer = session.getPlayers().stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player not in game"));

        // Mr X leaving an active game aborts it
        if (session.getPhase() == GamePhase.IN_PROGRESS
                && leavingPlayer.getRole() == com.scotlandyard.model.Role.MR_X) {
            session.setPhase(GamePhase.ENDED);
            session.setAbortReason("Mr. X has left the game");
            session.getPlayers().remove(leavingPlayer);
            gameRepository.save(session);
            return;
        }

        session.getPlayers().remove(leavingPlayer);

        // Delete game if host leaves the lobby or no players remain
        if (session.getPlayers().isEmpty()
                || (session.getPhase() == GamePhase.LOBBY && playerId.equals(session.getHostPlayerId()))) {
            gameRepository.delete(gameId);
            return;
        }

        gameRepository.save(session);
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

        List<PlayerDTO> playerDTOs = session.getPlayers().stream()
                .map(this::toPlayerDTO)
                .collect(Collectors.toList());
        dto.setPlayers(playerDTOs);

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
        for (int i = 0; i < JOIN_CODE_LENGTH; i++) {
            sb.append(JOIN_CODE_CHARS.charAt(random.nextInt(JOIN_CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
