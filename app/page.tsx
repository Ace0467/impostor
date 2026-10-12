"use client";

import { useMemo, useState } from "react";

type Role = "impostor" | "secret";

type Player = {
  id: number;
  name: string;
  role: Role;
  secretWord?: string;
};

const SECRET_BANK = [
  "Mar",
  "Luna",
  "Pizza",
  "Elefante",
  "Cielo",
  "Guitarra",
  "Fuego",
  "Nieve",
  "Pirata",
  "Piedra",
  "Bicicleta",
  "Sombra",
  "Bota",
  "Reloj",
  "Selva",
  "Pájaro",
  "Escuela",
  "Rosa",
  "Música",
  "Café",
  "Montaña",
  "Lava",
  "Camión",
  "Vela",
  "Cine",
  "Tigre",
  "Aventura",
  "Tren",
  "Abeja",
  "Delfín",
  "Fútbol",
  "Nube",
  "Avión",
  "Bosque",
  "Pasta",
  "Lago",
  "Cactus",
];

function shuffle<T>(items: T[]) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildPlayers(names: string[], impostorCount: number): Player[] {
  const validNames = names
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (validNames.length === 0) {
    return [];
  }

  const shuffledNames = shuffle(validNames);
  const actualImpostorCount = Math.min(impostorCount, shuffledNames.length);
  const secretWord = SECRET_BANK[Math.floor(Math.random() * SECRET_BANK.length)];

  return shuffledNames.map((name, index) => ({
    id: index,
    name,
    role: index < actualImpostorCount ? "impostor" : "secret",
    secretWord: index < actualImpostorCount ? undefined : secretWord,
  }));
}

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;

function getMaxImpostors(playerCount: number) {
  return Math.floor(playerCount * 0.25);
}

export default function Home() {
  const [playerCount, setPlayerCount] = useState(4);
  const [impostorCount, setImpostorCount] = useState(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"setup" | "pass" | "reveal" | "done">("setup");
  const [error, setError] = useState("");

  const currentPlayer = players[currentIndex];
  const maxImpostors = getMaxImpostors(playerCount);

  const canStart = useMemo(
    () =>
      playerCount >= MIN_PLAYERS &&
      impostorCount >= 1 &&
      impostorCount <= maxImpostors &&
      impostorCount < playerCount,
    [impostorCount, maxImpostors, playerCount]
  );

  function handlePlayerCountChange(delta: number) {
    setPlayerCount((previous) => {
      const next = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, previous + delta));
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
    const builtPlayers = buildPlayers(names, impostorCount);
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
                  disabled={playerCount >= MAX_PLAYERS}
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

          <p className="helper-text">Mínimo 4 jugadores • Máximo 25% impostores</p>

          {error ? <p className="error">{error}</p> : null}

          <button className="primary-button" onClick={handleStart} disabled={!canStart}>
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
              <div className="badge danger">IMPOSTOR</div>
              <h2>Tu rol es impostor</h2>
              <p className="role-copy">
                No sepas la palabra secreta. Intentá disimular y mezclarte con el grupo.
              </p>
            </>
          ) : (
            <>
              <div className="badge success">SECRETO</div>
              <h2>Tu palabra secreta es:</h2>
              <div className="secret-word">{currentPlayer.secretWord}</div>
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
          <p className="subtitle">La ronda puede empezar.</p>
          <button className="primary-button" onClick={resetGame}>
            Nuevo reparto
          </button>
        </section>
      )}
    </main>
  );
}
