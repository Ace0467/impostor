"use client";

import { useMemo, useState } from "react";

type Role = "impostor" | "secret";

type Player = {
  id: number;
  name: string;
  role: Role;
  secretWord?: string;
};

function shuffle<T>(items: T[]) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildPlayers(names: string[], impostorCount: number, secretWord: string): Player[] {
  const validNames = names
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (validNames.length === 0) {
    return [];
  }

  const actualImpostorCount = Math.min(impostorCount, validNames.length);
  const shuffledIndices = shuffle(Array.from({ length: validNames.length }, (_, index) => index));
  const impostorIndices = new Set(shuffledIndices.slice(0, actualImpostorCount));
  return validNames.map((name, index) => ({
    id: index,
    name,
    role: impostorIndices.has(index) ? "impostor" : "secret",
    secretWord: impostorIndices.has(index) ? undefined : secretWord,
  }));
}

const MIN_PLAYERS = 4;

function getMaxImpostors(playerCount: number) {
  return Math.floor(playerCount * 0.25);
}

export default function Home() {
  const [playerCount, setPlayerCount] = useState(4);
  const [impostorCount, setImpostorCount] = useState(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"setup" | "rules" | "pass" | "reveal" | "done">("setup");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicIntensity, setTopicIntensity] = useState<"obscuro" | "medianamente-conocido" | "conocido">(
    "medianamente-conocido"
  );
  const [secretWord, setSecretWord] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchSuggestion, setSearchSuggestion] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "refine" | "ready">("idle");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const currentPlayer = players[currentIndex];
  const maxImpostors = getMaxImpostors(playerCount);

  const canStart = useMemo(
    () =>
      playerCount >= MIN_PLAYERS &&
      impostorCount >= 1 &&
      impostorCount <= maxImpostors &&
      impostorCount < playerCount &&
      secretWord.length > 0,
    [impostorCount, maxImpostors, playerCount, secretWord]
  );

  async function handleTopicSearch() {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchError("Escribí un tema de al menos 3 caracteres.");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setSearchMessage("");
    setSearchSuggestion("");
    setSearchStatus("idle");
    setSecretWord("");

    try {
      const response = await fetch("/api/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topicIntensity }),
      });
      const result = (await response.json()) as {
        status?: "refine" | "ready";
        message?: string;
        suggestion?: string;
        secretWord?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "No se pudo completar la búsqueda.");
      }

      if (result.status === "ready" && result.secretWord) {
        setSecretWord(result.secretWord);
        setSearchStatus("ready");
        setSearchMessage(result.message || "Tema encontrado. La palabra se revelará durante el reparto.");
      } else {
        setSearchStatus("refine");
        setSearchMessage(result.message || "Ese tema es muy general. Probá hacerlo más específico.");
        setSearchSuggestion(result.suggestion || "");
      }
    } catch (caughtError) {
      setSearchError(
        caughtError instanceof Error ? caughtError.message : "No se pudo completar la búsqueda."
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handlePlayerCountChange(delta: number) {
    setPlayerCount((previous) => {
      const next = Math.max(MIN_PLAYERS, previous + delta);
      setImpostorCount((current) => Math.min(current, getMaxImpostors(next)));
      return next;
    });
  }

  function handleImpostorCountChange(delta: number) {
    setImpostorCount((previous) => {
      const next = Math.min(maxImpostors, Math.max(1, previous + delta));
      return next;
    });
  }

  function handleStart() {
    if (playerCount < MIN_PLAYERS) {
      setError("La cantidad mínima de jugadores es 4.");
      return;
    }

    if (impostorCount < 1 || impostorCount > maxImpostors) {
      setError("La cantidad de impostores no puede superar el 25% de los jugadores.");
      return;
    }

    const names = Array.from({ length: playerCount }, (_, index) => `Jugador ${index + 1}`);
    if (!secretWord) {
      setError("Primero buscá un tema para la partida.");
      return;
    }

    const builtPlayers = buildPlayers(names, impostorCount, secretWord);
    setPlayers(builtPlayers);
    setCurrentIndex(0);
    setPhase("pass");
    setError("");
  }

  function handleNext() {
    if (currentIndex >= players.length - 1) {
      setPhase("done");
      return;
    }

    setCurrentIndex((value) => value + 1);
    setPhase("pass");
  }

  function resetGame() {
    setPlayers([]);
    setCurrentIndex(0);
    setPhase("setup");
    setError("");
    setSearchQuery("");
    setSecretWord("");
    setSearchMessage("");
    setSearchSuggestion("");
    setSearchStatus("idle");
    setSearchError("");
  }

  return (
    <main className="app-shell">
      {phase === "setup" && (
        <section className="panel">
          <div className="brand-wrap">
            <span className="brand-mark">✦</span>
            <h1>Impostor</h1>
          </div>

          <div className="settings-grid">
            <div className="counter-card">
              <label className="field-label">Jugadores</label>
              <div className="stepper" aria-label="Cantidad de jugadores">
                <button
                  type="button"
                  className="stepper-button"
                  onClick={() => handlePlayerCountChange(-1)}
                  disabled={playerCount <= MIN_PLAYERS}
                >
                  −
                </button>
                <span className="stepper-value">{playerCount}</span>
                <button
                  type="button"
                  className="stepper-button"
                  onClick={() => handlePlayerCountChange(1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="counter-card">
              <label className="field-label">Impostores</label>
              <div className="stepper" aria-label="Cantidad de impostores">
                <button
                  type="button"
                  className="stepper-button"
                  onClick={() => handleImpostorCountChange(-1)}
                  disabled={impostorCount <= 1}
                >
                  −
                </button>
                <span className="stepper-value">{impostorCount}</span>
                <button
                  type="button"
                  className="stepper-button"
                  onClick={() => handleImpostorCountChange(1)}
                  disabled={impostorCount >= maxImpostors}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="topic-search-card">
            <label className="field-label" htmlFor="topic-search">
              Buscá el tema secreto
            </label>
            <p className="topic-search-hint">
              Escribí un tema; si es muy amplio, te ayudamos a especificarlo.
            </p>
            <form
              className="topic-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleTopicSearch();
              }}
            >
              <div className="topic-search-controls">
                <input
                  id="topic-search"
                  className="topic-search-input"
                  type="search"
                  value={searchQuery}
                  maxLength={120}
                  placeholder="Ej. fútbol argentino"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSecretWord("");
                    setSearchMessage("");
                    setSearchSuggestion("");
                    setSearchStatus("idle");
                    setSearchError("");
                  }}
                />
                <label className="topic-search-select-wrap">
                  <span className="field-label field-label-inline">Nicho</span>
                  <select
                    className="topic-search-select"
                    value={topicIntensity}
                    onChange={(event) => {
                      setTopicIntensity(
                        event.target.value as "obscuro" | "medianamente-conocido" | "conocido"
                      );
                    }}
                    aria-label="Nivel de nicho del tema"
                  >
                    <option value="obscuro">Obscuro</option>
                    <option value="medianamente-conocido">Medianamente conocido</option>
                    <option value="conocido">Conocido</option>
                  </select>
                </label>
              </div>
              <button className="primary-button topic-search-button" type="submit" disabled={isSearching}>
                {isSearching ? "Buscando…" : "Buscar tema"}
              </button>
            </form>
            {searchMessage ? (
              <p className={`topic-search-feedback ${searchStatus}`}>{searchMessage}</p>
            ) : null}
            {searchSuggestion ? (
              <button
                className="topic-suggestion"
                type="button"
                onClick={() => {
                  setSearchQuery(searchSuggestion);
                  setSecretWord("");
                  setSearchMessage("");
                  setSearchSuggestion("");
                  setSearchStatus("idle");
                }}
              >
                Probar: {searchSuggestion}
              </button>
            ) : null}
            {searchError ? <p className="error topic-search-error">{searchError}</p> : null}
          </div>

          <p className="helper-text">Mínimo 4 jugadores • Máximo 25% impostores</p>
          <p className="helper-text helper-text-small">Estos roles son para toda la partida.</p>

          {error ? <p className="error">{error}</p> : null}

          <button className="primary-button" onClick={() => setPhase("rules")} disabled={!canStart || isSearching}>
            Comenzar partida
          </button>
        </section>
      )}

      {phase === "rules" && (
        <section className="panel panel-rules">
          <p className="eyebrow">Reglas</p>
          <h2>Cómo se juega</h2>

          <ul className="rules-list">
            <li>Todos tienen un rol para toda la partida, y solo se revelan al pasar el celular.</li>
            <li>Los inocentes reciben una palabra secreta y deben decir una palabra relacionada.</li>
            <li>El impostor no sabe la palabra secreta y debe disimular para no ser descubierto.</li>
            <li>La partida termina cuando se descubre al impostor o cuando queda solo 1 inocente y uno o varios impostores.</li>
            <li>Si se descubre al impostor, ganan los inocentes. Si logra mezclarse y dejar pocos inocentes, gana el impostor.</li>
          </ul>

          <button className="primary-button" onClick={handleStart}>
            Comenzar reparto
          </button>
        </section>
      )}

      {phase === "pass" && currentPlayer && (
        <section className="panel panel-contrast">
          <p className="eyebrow">Pasa el celular</p>
          <h2>{currentPlayer.name}</h2>
          <p className="subtitle">
            Le toca a {currentPlayer.name}. Nadie más tiene que ver esta pantalla.
          </p>
          <button className="primary-button" onClick={() => setPhase("reveal")}>
            Ver mi rol
          </button>
        </section>
      )}

      {phase === "reveal" && currentPlayer && (
        <section className="panel panel-role">
          <p className="eyebrow">Rol asignado</p>

          {currentPlayer.role === "impostor" ? (
            <>
              <div className="role-word danger">IMPOSTOR</div>
              <p className="role-copy">
                No sabés la palabra secreta. Intentá disimular y mezclarte con el grupo.
              </p>
            </>
          ) : (
            <>
              <div className="role-tag success">Inocente</div>
              <div className="role-word success">{currentPlayer.secretWord}</div>
              <p className="role-copy">
                Decí una palabra relacionada con este tema y tratá de no llamar la atención.
              </p>
            </>
          )}

          <button className="primary-button" onClick={handleNext}>
            {currentIndex === players.length - 1 ? "Terminar reparto" : "Siguiente jugador"}
          </button>
        </section>
      )}

      {phase === "done" && (
        <section className="panel panel-finished">
          <p className="eyebrow">Listo</p>
          <h2>Todos tienen su rol</h2>
          <p className="subtitle">
            La partida empieza con estos roles. Termina si se descubre al impostor o si solo queda
            1 inocente junto a uno o varios impostores.
          </p>

          <div className="done-actions">
            <button className="primary-button secondary-button" onClick={() => {
              resetGame();
            }}>
              Nueva partida
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
