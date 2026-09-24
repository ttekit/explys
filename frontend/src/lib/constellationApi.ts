import { apiFetch, readApiErrorBody } from "./api";

export type StarPrerequisite = {
    prerequisiteId: number;
    dependentId: number;
};

export type Star = {
    id: number;
    constellationId: number;
    name: string;
    description: string | null;
    contentVideoId: number | null;
    prerequisites?: StarPrerequisite[];
    type?: "VIDEO" | "GRAMMAR" | "READING" | "PHRASE" | "TEST";
    metadata?: Record<string, unknown>;
};

export type Constellation = {
    id: number;
    name: string;
    description: string | null;
    rewardId: number | null;
    stars: Star[];
};

export type StarProgress = {
    starId: number;
    status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
};

export async function fetchAllConstellations(): Promise<Constellation[]> {
    const res = await apiFetch("/constellations", { method: "GET" });
    if (!res.ok) {
        throw new Error(await readApiErrorBody(res));
    }
    return res.json();
}

export async function fetchConstellationGraph(id: number): Promise<{
    constellationId: number;
    stars: StarProgress[];
}> {
    const res = await apiFetch(`/constellations/${id}/graph`, { method: "GET" });
    if (!res.ok) {
        throw new Error(await readApiErrorBody(res));
    }
    return res.json();
}

export async function completeStar(starId: number): Promise<unknown> {
    const res = await apiFetch(`/constellations/stars/${starId}/complete`, {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error(await readApiErrorBody(res));
    }
    return res.json();
}

export async function ensurePersonalConstellation(): Promise<Constellation> {
    const res = await apiFetch("/constellations/ensure", {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error(await readApiErrorBody(res));
    }
    return res.json();
}

export async function regeneratePersonalConstellation(): Promise<Constellation> {
    const res = await apiFetch("/constellations/regenerate", {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error(await readApiErrorBody(res));
    }
    return res.json();
}