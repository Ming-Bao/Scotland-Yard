import type { GameStateDTO } from "../types/game";

async function handleResponse<T>(res: Response): Promise<T> {
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
    }
    return data as T;
}

export async function createGame(
    hostName: string,
    maxPlayers: number,
): Promise<{ playerId: string; gameState: GameStateDTO }> {
    const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, maxPlayers }),
    });
    return handleResponse(res);
}

export async function joinGame(
    joinCode: string,
    playerName: string,
): Promise<{ playerId: string; gameState: GameStateDTO }> {
    const res = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerName }),
    });
    return handleResponse(res);
}

export async function getGame(gameId: string): Promise<GameStateDTO> {
    const res = await fetch(`/api/games/${gameId}`);
    return handleResponse(res);
}

export async function startGame(gameId: string, playerId: string): Promise<GameStateDTO> {
    const res = await fetch(`/api/games/${gameId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
    });
    return handleResponse(res);
}

export async function kickPlayer(gameId: string, hostId: string, targetPlayerId: string): Promise<void> {
    const res = await fetch(`/api/games/${gameId}/players/${targetPlayerId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to kick player");
    }
}

export async function leaveGame(gameId: string, playerId: string): Promise<void> {
    const res = await fetch(`/api/games/${gameId}/players/${playerId}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to leave game");
    }
}
