import { useEffect, useRef, useState } from 'react'
import './App.css'

const BOARD_SIZES = [3, 5, 7]
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const PARTY_PARAM = 'party'

const DEFAULT_PHRASES = [
  'Kawa w dlon',
  'To tylko szybkie pytanie',
  'Jeszcze jedna poprawka',
  'Wracam za 5 minut',
  'Dziala u mnie',
  'Nie ruszaj produkcji',
  'Commit na szybko',
  'Trzeba zrobic deploy',
  'Deadline byl wczoraj',
  'To jest priorytet',
  'Robimy refactor',
  'Zaraz sprawdze',
  'Mam lepszy pomysl',
  'Kto dotykal CSS',
  'To feature nie bug',
  'Jestem na callu',
  'Znowu cache',
  'Nie mamy backendu',
  'Pushnij na main',
  'Zrob screen',
  'Juz prawie gotowe',
  'Trzeba to ogarnac',
  'To bedzie proste',
  'Wyslij jeszcze raz',
  'Popraw tylko kolor',
  'Zmien nazwe zmiennej',
  'Dodaj loading',
  'Brakuje jednego ifa',
  'Mamy to na roadmapie',
  'Testy przechodza lokalnie',
  'To kwestia danych',
  'Zmienmy font',
  'Potrzebny hotfix',
  'Wrzuc to do backlogu',
  'Kto robi review',
  'Wyglada okej',
  'Musimy to przepiac',
  'Odpal preview',
  'Brakuje propsa',
  'To nie byl moj commit',
  'Jeszcze dark mode',
  'Zrob z tego modal',
  'Zadziala po refreshu',
  'Backend odda JSON',
  'Na mobile sie sypie',
  'Podmien endpoint',
  'Wyczysc console logi',
  'Skad te dane',
  'Moge to zmergowac',
  'Dopisze potem testy',
  'To przez rozszerzenie',
  'Klient chce na juz',
  'To tylko MVP',
  'Dodaj tooltip',
  'Trzeba to przeliczyc',
  'Niech bedzie prosciej',
  'Sprawdz jeszcze safari',
  'To sie da obejsc',
  'Kto ma dostep',
  'Potrzeba lepszego UX',
]

function normalizePhrases(input, boardSize) {
  const required = boardSize * boardSize
  const parsed = input
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  const merged = [...new Set([...parsed, ...DEFAULT_PHRASES])]
  return merged.slice(0, Math.max(merged.length, required))
}

function clampLines(boardSize, linesToWin) {
  const maxPossibleLines = boardSize * 2 + 2
  return Math.min(Math.max(linesToWin, 1), maxPossibleLines)
}

function getPartySearchParam() {
  return new URLSearchParams(window.location.search).get(PARTY_PARAM)
}

function setPartyInUrl(partyId) {
  const url = new URL(window.location.href)

  if (partyId) {
    url.searchParams.set(PARTY_PARAM, partyId)
  } else {
    url.searchParams.delete(PARTY_PARAM)
  }

  window.history.replaceState({}, '', url)
}

function getStoredPlayer(partyId) {
  if (!partyId) {
    return null
  }

  const rawValue = window.localStorage.getItem(`bingo-player-${partyId}`)
  return rawValue ? JSON.parse(rawValue) : null
}

function setStoredPlayer(partyId, player) {
  window.localStorage.setItem(`bingo-player-${partyId}`, JSON.stringify(player))
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error ?? 'Nie udalo sie wykonac operacji.')
  }

  return data
}

function App() {
  const initialPartyId = getPartySearchParam()
  const initialStoredPlayer = getStoredPlayer(initialPartyId)

  const [theme, setTheme] = useState('dark')
  const [mode, setMode] = useState(initialPartyId ? 'multi' : 'single')
  const [boardSize, setBoardSize] = useState(5)
  const [linesToWin, setLinesToWin] = useState(2)
  const [partyName, setPartyName] = useState('Piatkowe bingo')
  const [playerName, setPlayerName] = useState(initialStoredPlayer?.name ?? 'Gracz 1')
  const [phrasesText, setPhrasesText] = useState(DEFAULT_PHRASES.join('\n'))
  const [singleGame, setSingleGame] = useState(null)
  const [partyState, setPartyState] = useState(null)
  const [partyId, setPartyId] = useState(initialPartyId)
  const [playerId, setPlayerId] = useState(initialStoredPlayer?.playerId ?? null)
  const [statusMessage, setStatusMessage] = useState(
    initialPartyId ? 'Link wykryty. Mozesz dolaczyc do pokoju.' : '',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const eventSourceRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (mode !== 'multi' || !partyId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return undefined
    }

    const stream = new EventSource(
      `${API_BASE}/parties/${partyId}/stream${playerId ? `?playerId=${playerId}` : ''}`,
    )

    stream.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      setPartyState(payload.party)
    }

    stream.onerror = () => {
      setStatusMessage('Polaczenie realtime chwilowo przerwane. Probuje wznowic...')
    }

    eventSourceRef.current = stream

    return () => {
      stream.close()
    }
  }, [mode, partyId, playerId])

  useEffect(() => {
    if (mode === 'multi' && partyId) {
      setPartyInUrl(partyId)
    }

    if (mode !== 'multi') {
      setPartyInUrl(null)
    }
  }, [mode, partyId])

  const parsedPhrases = normalizePhrases(phrasesText, boardSize)
  const maxPossibleLines = boardSize * 2 + 2
  const currentPlayer =
    mode === 'single'
      ? singleGame?.player ?? null
      : partyState?.players.find((player) => player.id === playerId) ?? null
  const leaderboard =
    mode === 'single'
      ? singleGame?.player
        ? [singleGame.player]
        : []
      : [...(partyState?.players ?? [])].sort((a, b) => b.lines - a.lines)
  const winners =
    mode === 'single'
      ? singleGame?.player && singleGame.player.lines >= singleGame.linesToWin
        ? [singleGame.player]
        : []
      : (partyState?.players ?? []).filter((player) => player.lines >= partyState.linesToWin)
  const inviteLink = partyId ? `${window.location.origin}${window.location.pathname}?party=${partyId}` : ''

  const createSingleGame = () => {
    const safeLinesToWin = clampLines(boardSize, linesToWin)
    const cells = parsedPhrases
      .slice(0, boardSize * boardSize)
      .sort(() => Math.random() - 0.5)
      .map((label, index) => ({
        id: `solo-${index}-${label}`,
        label,
        marked: false,
      }))

    setSingleGame({
      boardSize,
      linesToWin: safeLinesToWin,
      player: {
        id: 'solo',
        name: playerName || 'Gracz 1',
        cells,
        lines: 0,
      },
    })
    setStatusMessage('Plansza single player gotowa.')
    setErrorMessage('')
  }

  const createParty = async () => {
    setIsBusy(true)
    setErrorMessage('')

    try {
      const data = await request('/parties', {
        method: 'POST',
        body: JSON.stringify({
          partyName,
          playerName,
          boardSize,
          linesToWin: clampLines(boardSize, linesToWin),
          phrases: parsedPhrases,
        }),
      })

      setMode('multi')
      setPartyId(data.party.id)
      setPartyState(data.party)
      setPlayerId(data.playerId)
      setStoredPlayer(data.party.id, { playerId: data.playerId, name: playerName })
      setStatusMessage('Pokoj utworzony. Mozesz skopiowac link i zaprosic druga osobe.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const joinParty = async () => {
    if (!partyId) {
      setErrorMessage('Brakuje identyfikatora pokoju w linku.')
      return
    }

    setIsBusy(true)
    setErrorMessage('')

    try {
      const existingPlayer = getStoredPlayer(partyId)

      if (existingPlayer?.playerId) {
        setPlayerId(existingPlayer.playerId)
        setPlayerName(existingPlayer.name)
        const data = await request(`/parties/${partyId}`)
        setPartyState(data.party)
        setStatusMessage('Wrociles do swojego pokoju.')
      } else {
        const data = await request(`/parties/${partyId}/join`, {
          method: 'POST',
          body: JSON.stringify({ playerName }),
        })

        setPlayerId(data.playerId)
        setPartyState(data.party)
        setStoredPlayer(partyId, { playerId: data.playerId, name: playerName })
        setStatusMessage('Dolaczyles do party po linku.')
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const loadParty = async (nextPartyId) => {
    setIsBusy(true)
    setErrorMessage('')

    try {
      const data = await request(`/parties/${nextPartyId}`)
      setPartyState(data.party)
      setStatusMessage('Pokoj znaleziony. Wpisz nick i dolacz.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (mode !== 'multi' || !partyId) {
      return
    }

    loadParty(partyId)
  }, [mode, partyId])

  const toggleSingleCell = (cellId) => {
    if (!singleGame) {
      return
    }

    const nextCells = singleGame.player.cells.map((cell) =>
      cell.id === cellId ? { ...cell, marked: !cell.marked } : cell,
    )

    const nextLines = countLines(nextCells, singleGame.boardSize)

    setSingleGame({
      ...singleGame,
      player: {
        ...singleGame.player,
        cells: nextCells,
        lines: nextLines,
      },
    })
  }

  const togglePartyCell = async (cellId) => {
    if (!partyId || !playerId) {
      return
    }

    try {
      await request(`/parties/${partyId}/mark`, {
        method: 'POST',
        body: JSON.stringify({ playerId, cellId }),
      })
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(inviteLink)
      setStatusMessage('Link zaproszenia skopiowany.')
    } catch {
      setStatusMessage(`Skopiuj recznie: ${inviteLink}`)
    }
  }

  const leaveParty = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setPartyState(null)
    setPartyId(null)
    setPlayerId(null)
    setMode('single')
    setStatusMessage('Wrociles do trybu single player.')
    setErrorMessage('')
    setPartyInUrl(null)
  }

  const gameBoardSize = mode === 'single' ? singleGame?.boardSize : partyState?.boardSize
  const linesGoal = mode === 'single' ? singleGame?.linesToWin : partyState?.linesToWin

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">React Bingo</p>
          <h1>Bingo z pokojem po linku i wspolnym leaderboardem</h1>
        </div>

        <div className="topbar-actions">
          <div className="toggle-group" role="tablist" aria-label="Tryb gry">
            <button
              type="button"
              className={mode === 'single' ? 'is-active' : ''}
              onClick={() => setMode('single')}
            >
              Single player
            </button>
            <button
              type="button"
              className={mode === 'multi' ? 'is-active' : ''}
              onClick={() => setMode('multi')}
            >
              Multiplayer online
            </button>
          </div>

          <div className="toggle-group" role="tablist" aria-label="Motyw">
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              onClick={() => setTheme('light')}
            >
              Jasny
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              onClick={() => setTheme('dark')}
            >
              Ciemny
            </button>
          </div>
        </div>
      </section>

      <section className="layout">
        <aside className="panel settings-panel">
          <div className="panel-header">
            <h2>Ustawienia</h2>
            <p>
              W single tworzysz plansze lokalnie. W multiplayerze zakladasz pokoj i zapraszasz
              kogos po linku.
            </p>
          </div>

          <label className="field">
            <span>{mode === 'multi' ? 'Twoj nick' : 'Nazwa gracza'}</span>
            <input
              type="text"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
            />
          </label>

          {mode === 'multi' ? (
            <label className="field">
              <span>Nazwa pokoju</span>
              <input
                type="text"
                value={partyName}
                onChange={(event) => setPartyName(event.target.value)}
              />
            </label>
          ) : null}

          <div className="field">
            <span>Rozmiar planszy</span>
            <div className="size-grid">
              {BOARD_SIZES.map((size) => (
                <button
                  type="button"
                  key={size}
                  className={boardSize === size ? 'is-active' : ''}
                  onClick={() => setBoardSize(size)}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Linie do wygranej</span>
            <input
              type="number"
              min="1"
              max={maxPossibleLines}
              value={linesToWin}
              onChange={(event) => setLinesToWin(Number(event.target.value) || 1)}
            />
            <small>Maksymalnie {maxPossibleLines} linii dla planszy {boardSize}x{boardSize}.</small>
          </label>

          <label className="field">
            <span>Hasla bingo, po jednym na linie</span>
            <textarea
              rows="12"
              value={phrasesText}
              onChange={(event) => setPhrasesText(event.target.value)}
            />
            <small>
              W multiplayerze ten zestaw dostaja wszyscy, ale kazdemu serwer losuje inna plansze.
            </small>
          </label>

          {mode === 'single' ? (
            <div className="actions">
              <button type="button" className="primary-button" onClick={createSingleGame}>
                Stworz plansze
              </button>
            </div>
          ) : (
            <div className="actions actions-stack">
              <button
                type="button"
                className="primary-button"
                onClick={createParty}
                disabled={isBusy}
              >
                Stworz pokoj
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={joinParty}
                disabled={isBusy || !partyId}
              >
                Dolacz z tego linku
              </button>
              {partyId ? (
                <button type="button" className="secondary-button" onClick={copyInviteLink}>
                  Kopiuj link
                </button>
              ) : null}
              {(partyState || partyId) && (
                <button type="button" className="secondary-button" onClick={leaveParty}>
                  Opuść pokoj
                </button>
              )}
            </div>
          )}

          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        </aside>

        <section className="board-stage">
          <div className="stage-header">
            <div>
              <p className="eyebrow">Menu gry</p>
              <h2>
                {mode === 'single'
                  ? singleGame
                    ? 'Single player'
                    : 'Najpierw utworz plansze'
                  : partyState?.partyName ?? partyName}
              </h2>
            </div>
            <div className="summary-card">
              <span>Tryb</span>
              <strong>{mode === 'multi' ? 'Pokoj online' : 'Single player'}</strong>
              <span>Cel</span>
              <strong>{linesGoal ?? linesToWin} linii</strong>
            </div>
          </div>

          {mode === 'multi' ? (
            <div className="network-card">
              <div>
                <span className="network-label">Link zaproszenia</span>
                <strong>{inviteLink || 'Powstanie po stworzeniu pokoju'}</strong>
              </div>
              <div>
                <span className="network-label">Status pokoju</span>
                <strong>{partyState ? `${partyState.players.length} graczy online` : 'Oczekiwanie'}</strong>
              </div>
            </div>
          ) : null}

          {currentPlayer && gameBoardSize ? (
            <>
              <div className="board-meta">
                <p>
                  Twoja plansza: <strong>{currentPlayer.name}</strong>
                </p>
                <p>
                  Linie: <strong>{currentPlayer.lines}</strong> / {linesGoal}
                </p>
                {mode === 'multi' ? (
                  <p>
                    Widok tylko Twojej planszy. Reszte widzisz na leaderboardzie po prawej.
                  </p>
                ) : null}
              </div>

              <div
                className={`board board-${gameBoardSize}`}
                style={{ gridTemplateColumns: `repeat(${gameBoardSize}, minmax(0, 1fr))` }}
              >
                {currentPlayer.cells.map((cell) => (
                  <button
                    type="button"
                    key={cell.id}
                    className={`board-cell ${cell.marked ? 'is-marked' : ''}`}
                    onClick={() =>
                      mode === 'single' ? toggleSingleCell(cell.id) : togglePartyCell(cell.id)
                    }
                  >
                    <span>{cell.label}</span>
                    {cell.marked ? <i aria-hidden="true" className="marker-circle" /> : null}
                  </button>
                ))}
              </div>

              <div className="winner-banner" aria-live="polite">
                {winners.length > 0 ? (
                  <span>Wygrana: {winners.map((winner) => winner.name).join(', ')}</span>
                ) : (
                  <span>
                    Klikaj pola, a czerwone kolko zaznaczy trafienie. Linie licza sie od razu w
                    rankingu.
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>
                {mode === 'single'
                  ? 'Wybierz ustawienia i utworz plansze.'
                  : 'Stworz pokoj albo wejdz z linku i dolacz do multiplayera.'}
              </p>
              <small>
                W trybie online kazdy gracz ma swoja wylosowana plansze, a po prawej widac wspolny
                leaderboard.
              </small>
            </div>
          )}
        </section>

        <aside className="panel leaderboard-panel">
          <div className="panel-header">
            <h2>Leaderboard</h2>
            <p>Kazdy widzi tu, kto ma ile linii lacznie. Plansze pozostaja prywatne.</p>
          </div>

          {leaderboard.length > 0 ? (
            <div className="leaderboard-list">
              {leaderboard.map((player, index) => (
                <div className="leaderboard-row" key={player.id}>
                  <div>
                    <span className="leaderboard-rank">#{index + 1}</span>
                    <strong>{player.name}</strong>
                  </div>
                  <div className="leaderboard-score">
                    <strong>{player.lines}</strong>
                    <span>linii</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-side-card">
              <p>Po stworzeniu gry albo dolaczeniu do pokoju tutaj pojawi sie ranking.</p>
            </div>
          )}

          <div className="side-note">
            <strong>Jak działa online</strong>
            <p>
              Pokoj jest trzymany na serwerze Node w pamieci. Link zaproszenia prowadzi do tego
              samego party, a zmiany planszy leca realtime przez SSE.
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}

function countLines(cells, size) {
  const marked = new Set(cells.filter((cell) => cell.marked).map((cell) => cell.id))
  let total = 0

  for (let row = 0; row < size; row += 1) {
    const done = Array.from({ length: size }, (_, column) => cells[row * size + column]).every(
      (cell) => marked.has(cell.id),
    )

    if (done) {
      total += 1
    }
  }

  for (let column = 0; column < size; column += 1) {
    const done = Array.from({ length: size }, (_, row) => cells[row * size + column]).every(
      (cell) => marked.has(cell.id),
    )

    if (done) {
      total += 1
    }
  }

  const diagonalA = Array.from({ length: size }, (_, index) => cells[index * size + index]).every(
    (cell) => marked.has(cell.id),
  )
  const diagonalB = Array.from(
    { length: size },
    (_, index) => cells[index * size + (size - 1 - index)],
  ).every((cell) => marked.has(cell.id))

  return total + Number(diagonalA) + Number(diagonalB)
}

export default App
