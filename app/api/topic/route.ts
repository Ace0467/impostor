import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WikipediaSearchResult = {
  ns: number;
  title: string;
};

type WikipediaSearchResponse = {
  query?: {
    searchinfo?: { totalhits?: number };
    search?: WikipediaSearchResult[];
  };
};

const STOP_WORDS = new Set([
  "a", "al", "con", "de", "del", "el", "en", "la", "las", "los", "para", "por", "un", "una", "y",
]);

const TOPIC_TYPE_WORDS = new Set([
  "actores", "actrices", "animales", "autores", "bandas", "canciones", "cantantes", "ciudades",
  "clubes", "deportistas", "equipos", "estadios", "escritores", "especies", "futbolistas", "jugador",
  "jugadores", "libros", "marcas", "peliculas", "personajes", "presidentes",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function searchWikipedia(searchTerm: string): Promise<WikipediaSearchResponse> {
  const url = new URL("https://es.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    list: "search",
    srsearch: searchTerm,
    srlimit: "20",
    srinfo: "totalhits",
    utf8: "1",
  }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ImpostorRoleAssigner/1.0 (https://impostor-role-app.vercel.app/)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Wikipedia respondió ${response.status}`);
  }

  return (await response.json()) as WikipediaSearchResponse;
}

function getRefinementSuggestion(query: string) {
  return `Personas, equipos, lugares o eventos de ${query}`;
}

function isFootballPlayerTitle(title: string) {
  return /\(futbolista(?:\s|\))/i.test(title);
}

function isFootballClubTitle(title: string) {
  return /\bclub\b/i.test(title) && normalize(title) !== "club de futbol";
}

export async function POST(request: Request) {
  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No pudimos leer la búsqueda. Intentá de nuevo." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 3 || query.length > 120) {
    return NextResponse.json({ error: "Escribí un tema de entre 3 y 120 caracteres." }, { status: 400 });
  }

  const normalizedQuery = normalize(query);
  const words = normalizedQuery.split(/\s+/).filter((word) => word && !STOP_WORDS.has(word));
  const hasSpecificType = words.some((word) => TOPIC_TYPE_WORDS.has(word));
  const asksForFootballPlayers = /\b(jugador|jugadores|futbolistas)\b/.test(normalizedQuery) &&
    /\bfutbol\b/.test(normalizedQuery);
  const asksForFootballTeams = /\b(equipo|equipos|club|clubes)\b/.test(normalizedQuery) &&
    /\bfutbol\b/.test(normalizedQuery);

  try {
    let candidates: WikipediaSearchResult[] = [];

    if (asksForFootballPlayers || asksForFootballTeams) {
      const context = normalizedQuery
        .replace(/\b(jugador|jugadores|futbolista|futbolistas|equipo|equipos|club|clubes|futbol|de|del|el|la|los|las|y|o)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const searches: Promise<WikipediaSearchResponse>[] = [];
      if (asksForFootballPlayers) {
        searches.push(searchWikipedia(`intitle:futbolista ${context}`.trim()));
      }
      if (asksForFootballTeams) {
        searches.push(searchWikipedia(`intitle:club futbol ${context}`.trim()));
      }

      const results = await Promise.all(searches);
      const matchingResults = results.flatMap((result) => result.query?.search ?? []);
      candidates = matchingResults.filter((result) =>
        (asksForFootballPlayers && isFootballPlayerTitle(result.title)) ||
        (asksForFootballTeams && isFootballClubTitle(result.title))
      );
    } else {
      const result = await searchWikipedia(query);
      candidates = result.query?.search ?? [];

      const hasExactArticle = candidates.some((candidate) => normalize(candidate.title) === normalizedQuery);
      if (words.length <= 2 && !hasSpecificType && !hasExactArticle) {
        return NextResponse.json({
          status: "refine",
          message: "Ese tema es muy amplio. Agregá qué tipo de resultado querés encontrar.",
          suggestion: getRefinementSuggestion(query),
        });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        status: "refine",
        message: "No encontré artículos que encajen bien. Probá reformular o acotar el tema.",
        suggestion: "",
      });
    }

    const exactCandidate = candidates.find((candidate) => normalize(candidate.title) === normalizedQuery);
    if (exactCandidate) {
      candidates = [exactCandidate];
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return NextResponse.json({
      status: "ready",
      message: "Encontré una palabra. Se revelará únicamente a los inocentes.",
      secretWord: selected.title,
    });
  } catch (error) {
    console.error("Wikipedia topic search failed", error);
    return NextResponse.json(
      { error: "Wikipedia no pudo completar la búsqueda. Intentá de nuevo en un momento." },
      { status: 502 }
    );
  }
}