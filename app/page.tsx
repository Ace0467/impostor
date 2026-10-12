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

export default function Home() {
  const [playerCount, setPlayerCount] = useState(5);
  const [impostorCount, setImpostorCount] = useState(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"setup" | "pass" | "reveal" | "done">("setup");
  const [error, setError] = useState("");

  const currentPlayer = players[currentIndex];
  const maxImpostorCount = Math.max(1, playerCount - 1);

  const canStart = useMemo(
    () => playerCount >= 2 && impostorCount >= 1 && impostorCount < playerCount,
    [impostorCount, playerCount]
  );

  function handlePlayerCountChange(nextCount: number) {
    setPlayerCount(nextCount);
    setImpostorCount((previous) => Math.min(previous, Math.max(1, nextCount - 1)));
  }

  function handleStart() {
    if (playerCount < 2) {
      setError("Necesitás al menos 2 jugadores para empezar.");
      return;
    }

    if (impostorCount < 1 || impostorCount >= playerCount) {
      setError("La cantidad de impostores debe ser mayor que 0 y menor que la cantidad de jugadores.");
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
          <h1>Impostor</h1>

          <div className="settings-row settings-row-selects">
            <div className="select-group">
              <label className="field-label" htmlFor="players">
                Jugadores
              </label>
              <select
                id="players"
                className="select-input"
                value={playerCount}
                onChange={(event) => handlePlayerCountChange(Number(event.target.value))}
              >
                {Array.from({ length: 10 }, (_, index) => index + 2).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-group">
              <label className="field-label" htmlFor="impostors">
                Impostores
              </label>
              <select
                id="impostors"
                className="select-input"
                value={impostorCount}
                onChange={(event) => setImpostorCount(Number(event.target.value))}
              >
                {Array.from({ length: maxImpostorCount }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
