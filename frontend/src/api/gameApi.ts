import type { GameStateDTO, MapData } from "../types/game";

async function handleResponse<T>(res: Response): Promise<T> {
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
    }
    return data as T;
}

async function handleNoContent(res: Response): Promise<void> {
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
    }
}

export async function createGame(
    hostName: string,
    maxPlayers: number,
): Promise<{ playerId: string; gameState: GameStateDTO }> {
    const res = await fetch("/api/games/create", {
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

export async function leaveGame(gameId: string, playerId: string): Promise<void> {
    const res = await fetch(`/api/games/${gameId}/players/${playerId}`, {
        method: "DELETE",
    });
    return handleNoContent(res);
}

export async function getMap(): Promise<MapData> {
    const res = await fetch('/test-map.json')
    if (!res.ok) throw new Error('Failed to load map data')
    return res.json()
}

export async function kickPlayer(gameId: string, hostId: string, targetPlayerId: string): Promise<void> {
    const res = await fetch(`/api/games/${gameId}/players/${targetPlayerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: hostId }),
    });
    return handleNoContent(res);
}
