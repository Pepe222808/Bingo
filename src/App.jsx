import { useCallback, useDeferredValue, useMemo, useEffect, useRef, useState } from 'react'
import './App.css'

const BOARD_SIZES = [3, 5, 7]
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const PARTY_PARAM = 'party'
const LOCALE_PL = 'pl'
const LOCALE_EN = 'en'

const TEXT = {
  en: {
    appTitle: 'React Bingo',
    appHero: 'Bingo with online rooms and private boards',
    modeSingle: 'Single Player',
    modeMulti: 'Multiplayer',
    themeLight: 'Light',
    themeDark: 'Dark',
    settingsTitle: 'Settings',
    settingsSingleDesc: 'Create and play your board locally.',
    settingsMultiLobbyDesc: 'Choose to create a room or join an existing one.',
    settingsMultiHostDesc: 'You are the host. Configure and start the next board for all players.',
    settingsMultiPlayerDesc: 'You are a player. Board settings are controlled by the host.',
    labelPlayerSingle: 'Player Name',
    labelPlayerMulti: 'Your Nickname',
    labelPartyName: 'Room Name',
    labelRoomInput: 'Room Code or Invite Link',
    roomInputPlaceholder: 'e.g. A1B2C3 or full invite link',
    roomInputHint: 'Paste a room code or an invite link.',
    actionGroup: 'Multiplayer Action',
    actionJoin: 'Join',
    actionCreate: 'Create',
    boardSize: 'Board Size',
    boardSizeHint: 'Sizes unlock by phrase count: 9 -> 3x3, 25 -> 5x5, 49 -> 7x7.',
    linesToWin: 'Lines to Win',
    linesToWinHint: 'Maximum {max} lines for a {size}x{size} board.',
    endGame: 'Game End Rule',
    endGameSwitch: 'End after first winner',
    endGameOnHint: 'After first win, marking is locked.',
    endGameOffHint: 'Game continues and everyone can keep scoring lines.',
    phrases: 'Bingo Phrases (one per line)',
    phrasesHint: 'All players use this phrase pool. Each player gets a randomized board.',
    singleCreate: 'Create Board',
    restartRoomBoard: 'Create New Board in This Room',
    multiCreateRoom: 'Create Room',
    multiJoinRoom: 'Join Room',
    multiJoinAsNew: 'Join as New Player',
    multiGoJoin: 'Go to Join',
    multiGoCreate: 'Go to Create',
    copyLink: 'Copy Invite Link',
    copyCode: 'Copy Code: {code}',
    leaveRoom: 'Leave Room',
    leavePreview: 'Leave Preview',
    hostOnlyNotice: 'Waiting for host. Only host can change settings and start a new board.',
    roomCreated: 'Room created. Room code: {code}.',
    boardCreated: 'Single-player board is ready.',
    boardRestarted: 'New board created in this room.',
    rejoined: 'You rejoined your room.',
    joinedByLink: 'You joined the room.',
    linkCopied: 'Invite link copied.',
    linkManual: 'Copy manually: {link}',
    codeCopied: 'Room code {code} copied.',
    codeManual: 'Room code: {code}',
    switchedToSingle: 'Switched to single-player mode.',
    modeLabel: 'Mode',
    goalLabel: 'Goal',
    goalLines: '{count} lines',
    stageTitleSingleReady: 'Single Player',
    stageTitleSingleEmpty: 'Create a board first',
    gameMenu: 'Game Menu',
    networkLink: 'Invite Link',
    networkCode: 'Room Code',
    networkStatus: 'Room Status',
    networkStatusWaiting: 'Waiting',
    networkStatusPlayers: '{count} players online',
    playerBoard: 'Your board: {name}',
    playerLines: 'Lines: {lines} / {goal}',
    privateBoardHint: 'You only see your board. Other players are visible on the leaderboard.',
    winnerPrefix: 'Winner: {names}',
    winnerFinalPrefix: 'Game over. Winner: {names}',
    emptySingle: 'Choose settings and create a board.',
    emptyMulti: 'Join a room by code or create a new room.',
    emptyHint: 'In online mode each player gets a private board and shares one leaderboard.',
    leaderboardTitle: 'Leaderboard',
    leaderboardHint: 'Everyone sees total lines. Boards remain private.',
    winnerBadge: 'Winner',
    linesUnit: 'lines',
    leaderboardEmpty: 'Leaderboard appears after creating or joining a room.',
    onlineInfoTitle: 'How Online Mode Works',
    onlineInfoText: 'Rooms and boards are stored in Supabase. Invite link points to the same room and game state auto-refreshes.',
    mobileSingleHint: 'Single mode selected. Open the settings panel to configure your board.',
    mobileOpenSingle: 'Open Single Menu',
    mobileOpenCreate: 'Open Create Menu',
    mobileCreateHint: 'Create selected. Open settings panel to configure room and board.',
    requiredPlayer: 'Enter player name.',
    requiredNick: 'Enter your nickname.',
    requiredParty: 'Enter room name.',
    requiredJoinInput: 'Enter room code or invite link.',
    notFoundRoom: 'Room not found. Check code or link.',
    noPartyId: 'Room ID is missing in the link.',
    minPhrases: 'For {size}x{size} board you need at least {count} phrases.',
    apiOffline: 'API connection failed. Run locally with: npm run dev:vercel (instead of npm run dev).',
  },
  pl: {
    appTitle: 'React Bingo',
    appHero: 'Bingo z pokojami online i prywatnymi planszami',
    modeSingle: 'Single Player',
    modeMulti: 'Multiplayer',
    themeLight: 'Jasny',
    themeDark: 'Ciemny',
    settingsTitle: 'Ustawienia',
    settingsSingleDesc: 'Tworzysz i grasz lokalnie na swojej planszy.',
    settingsMultiLobbyDesc: 'Wybierz: utworz pokoj albo dolacz do istniejacego.',
    settingsMultiHostDesc: 'Jestes hostem. Ustawiasz i uruchamiasz kolejna plansze dla wszystkich.',
    settingsMultiPlayerDesc: 'Jestes graczem. Ustawienia planszy kontroluje host.',
    labelPlayerSingle: 'Nazwa Gracza',
    labelPlayerMulti: 'Twoj Nick',
    labelPartyName: 'Nazwa Pokoju',
    labelRoomInput: 'Kod Pokoju lub Link',
    roomInputPlaceholder: 'np. A1B2C3 albo pelny link',
    roomInputHint: 'Wklej kod pokoju albo link zaproszenia.',
    actionGroup: 'Akcja Multiplayer',
    actionJoin: 'Dolacz',
    actionCreate: 'Stworz',
    boardSize: 'Rozmiar Planszy',
    boardSizeHint: 'Rozmiary aktywuja sie progowo: 9 -> 3x3, 25 -> 5x5, 49 -> 7x7.',
    linesToWin: 'Linie do Wygranej',
    linesToWinHint: 'Maksymalnie {max} linii dla planszy {size}x{size}.',
    endGame: 'Zasada Zakonczenia',
    endGameSwitch: 'Zakoncz po pierwszym zwyciezcy',
    endGameOnHint: 'Po pierwszej wygranej dalsze zaznaczanie jest zablokowane.',
    endGameOffHint: 'Gra trwa dalej i kazdy moze dobijac kolejne linie.',
    phrases: 'Hasla Bingo (jedno na linie)',
    phrasesHint: 'Wszyscy gracze dostaja te hasla, ale kazdy ma wylosowana inna plansze.',
    singleCreate: 'Stworz Plansze',
    restartRoomBoard: 'Utworz nowa plansze w tym pokoju',
    multiCreateRoom: 'Stworz Pokoj',
    multiJoinRoom: 'Dolacz do Pokoju',
    multiJoinAsNew: 'Dolacz jako Nowy Gracz',
    multiGoJoin: 'Przejdz do Dolaczania',
    multiGoCreate: 'Przejdz do Tworzenia',
    copyLink: 'Kopiuj Link',
    copyCode: 'Kopiuj Kod: {code}',
    leaveRoom: 'Opusc Pokoj',
    leavePreview: 'Opusc Podglad',
    hostOnlyNotice: 'Czekasz na hosta. Tylko host moze zmieniac ustawienia i uruchomic nowa plansze.',
    roomCreated: 'Pokoj utworzony. Kod pokoju: {code}.',
    boardCreated: 'Plansza single-player gotowa.',
    boardRestarted: 'Nowa plansza utworzona w tym pokoju.',
    rejoined: 'Wrociles do swojego pokoju.',
    joinedByLink: 'Dolaczyles do pokoju.',
    linkCopied: 'Link zaproszenia skopiowany.',
    linkManual: 'Skopiuj recznie: {link}',
    codeCopied: 'Kod pokoju {code} skopiowany.',
    codeManual: 'Kod pokoju: {code}',
    switchedToSingle: 'Wrociles do trybu single-player.',
    modeLabel: 'Tryb',
    goalLabel: 'Cel',
    goalLines: '{count} linii',
    stageTitleSingleReady: 'Single Player',
    stageTitleSingleEmpty: 'Najpierw utworz plansze',
    gameMenu: 'Menu Gry',
    networkLink: 'Link Zaproszenia',
    networkCode: 'Kod Pokoju',
    networkStatus: 'Status Pokoju',
    networkStatusWaiting: 'Oczekiwanie',
    networkStatusPlayers: '{count} graczy online',
    playerBoard: 'Twoja plansza: {name}',
    playerLines: 'Linie: {lines} / {goal}',
    privateBoardHint: 'Widzisz tylko swoja plansze. Reszte widzisz na leaderboardzie.',
    winnerPrefix: 'Wygrywa: {names}',
    winnerFinalPrefix: 'Koniec gry. Zwyciezca: {names}',
    emptySingle: 'Wybierz ustawienia i utworz plansze.',
    emptyMulti: 'Dolacz kodem lub utworz nowy pokoj.',
    emptyHint: 'W trybie online kazdy gracz ma prywatna plansze i wspolny leaderboard.',
    leaderboardTitle: 'Leaderboard',
    leaderboardHint: 'Kazdy widzi laczna liczbe linii. Plansze pozostaja prywatne.',
    winnerBadge: 'Zwyciezca',
    linesUnit: 'linii',
    leaderboardEmpty: 'Ranking pojawi sie po utworzeniu gry albo dolaczeniu do pokoju.',
    onlineInfoTitle: 'Jak dziala Online',
    onlineInfoText: 'Pokoj i plansze sa zapisywane w Supabase. Link prowadzi do tego samego pokoju, a stan gry odswieza sie automatycznie.',
    mobileSingleHint: 'Wybrano single. Otworz panel ustawien i skonfiguruj plansze.',
    mobileOpenSingle: 'Otworz Menu Single',
    mobileOpenCreate: 'Otworz Menu Tworzenia',
    mobileCreateHint: 'Wybrano tworzenie. Otworz panel ustawien i skonfiguruj pokoj.',
    requiredPlayer: 'Podaj nazwe gracza.',
    requiredNick: 'Podaj swoj nick.',
    requiredParty: 'Podaj nazwe pokoju.',
    requiredJoinInput: 'Wpisz kod pokoju albo link.',
    notFoundRoom: 'Nie znaleziono pokoju. Sprawdz kod lub link.',
    noPartyId: 'Brakuje identyfikatora pokoju w linku.',
    minPhrases: 'Dla planszy {size}x{size} potrzebujesz min. {count} hasel.',
    apiOffline: 'Brak polaczenia z API. Lokalnie uruchom: npm run dev:vercel (zamiast npm run dev).',
  },
}

function normalizePhrases(input) {
  return [...new Set(input
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean))]
}

function detectLocaleFromPath(pathname) {
  return pathname === '/pl' || pathname.startsWith('/pl/') ? LOCALE_PL : LOCALE_EN
}

function createDefaultPhrases(locale) {
  const prefix = locale === LOCALE_PL ? 'Haslo' : 'Phrase'
  return Array.from({ length: 25 }, (_, index) => `${prefix} ${index + 1}`)
}

function formatText(template, values = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

function getAvailableBoardSizes(phraseCount) {
  return BOARD_SIZES.filter((size) => phraseCount >= size * size)
}

function getPartySignature(party) {
  if (!party) return 'none'
  return JSON.stringify({
    id: party.id,
    boardSize: party.boardSize,
    linesToWin: party.linesToWin,
    stopOnFirstWin: Boolean(party.stopOnFirstWin),
    winnerRoomPlayerId: party.winnerRoomPlayerId ?? null,
    players: (party.players ?? []).map((player) => ({
      id: player.id,
      lines: player.lines,
      marked: (player.cells ?? []).map((cell) => Number(Boolean(cell.marked))),
    })),
  })
}

function clampLines(boardSize, linesToWin) {
  const maxPossibleLines = boardSize * 2 + 2
  return Math.min(Math.max(linesToWin, 1), maxPossibleLines)
}

function getPartySearchParam() {
  return new URLSearchParams(window.location.search).get(PARTY_PARAM)
}

function sanitizeRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
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
  if (!partyId) return null
  const rawValue = window.localStorage.getItem(`bingo-player-${partyId}`)
  return rawValue ? JSON.parse(rawValue) : null
}

function setStoredPlayer(partyId, player) {
  window.localStorage.setItem(`bingo-player-${partyId}`, JSON.stringify(player))
}

function clearStoredPlayer(partyId) {
  if (!partyId) return
  window.localStorage.removeItem(`bingo-player-${partyId}`)
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    })
  } catch {
    throw new Error(
      'Brak polaczenia z API. Lokalnie uruchom: npm run dev:vercel (zamiast npm run dev).',
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error ?? 'Nie udalo sie wykonac operacji.')
  }

  return data
}

function App() {
  const locale = detectLocaleFromPath(window.location.pathname)
  const t = (key, values) => formatText(TEXT[locale][key], values)
  const defaultPhrases = createDefaultPhrases(locale)
  const initialPartyId = getPartySearchParam()
  const initialStoredPlayer = getStoredPlayer(initialPartyId)

  const [theme, setTheme] = useState('dark')
  const [mode, setMode] = useState(initialPartyId ? 'multi' : 'single')
  const [boardSize, setBoardSize] = useState(5)
  const [linesToWin, setLinesToWin] = useState(2)
  const [endOnFirstWin, setEndOnFirstWin] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [playerName, setPlayerName] = useState(initialStoredPlayer?.name ?? '')
  const [phrasesText, setPhrasesText] = useState(defaultPhrases.join('\n'))
  const [singleGame, setSingleGame] = useState(null)
  const [partyState, setPartyState] = useState(null)
  const [partyId, setPartyId] = useState(initialPartyId)
  const [joinInput, setJoinInput] = useState('')
  const [multiLobbyView, setMultiLobbyView] = useState('join')
  const [playerId, setPlayerId] = useState(initialStoredPlayer?.playerId ?? null)
  const [joinToken, setJoinToken] = useState(initialStoredPlayer?.joinToken ?? null)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 720)
  const layoutRef = useRef(null)
  const didCenterMobileRef = useRef(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 720)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isMobile || didCenterMobileRef.current || !layoutRef.current) return
    const container = layoutRef.current
    container.scrollLeft = container.clientWidth
    didCenterMobileRef.current = true
  }, [isMobile])

  useEffect(() => {
    if (mode === 'multi' && partyId) {
      setPartyInUrl(partyId)
    }
    if (mode !== 'multi') {
      setPartyInUrl(null)
    }
  }, [mode, partyId])

  useEffect(() => {
    if (mode === 'multi' && !partyState) {
      setMultiLobbyView('join')
    }
  }, [mode, partyState])

  const deferredPhrasesText = useDeferredValue(phrasesText)
  const parsedPhrases = useMemo(() => normalizePhrases(deferredPhrasesText), [deferredPhrasesText])
  const availableBoardSizes = useMemo(
    () => getAvailableBoardSizes(parsedPhrases.length),
    [parsedPhrases.length],
  )
  const canCreateForSelectedSize = parsedPhrases.length >= boardSize * boardSize
  const maxPossibleLines = boardSize * 2 + 2
  const canUsePlayerName = Boolean(playerName.trim())
  const canUsePartyName = Boolean(partyName.trim())
  const phrasesPlaceholder = defaultPhrases.join('\n')

  useEffect(() => {
    if (availableBoardSizes.length === 0) return
    if (!availableBoardSizes.includes(boardSize)) {
      setBoardSize(availableBoardSizes[availableBoardSizes.length - 1])
    }
  }, [availableBoardSizes, boardSize])
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
      ? singleGame?.player
        ? singleGame.stopOnFirstWin
          ? singleGame.winnerDeclared
            ? [singleGame.player]
            : []
          : singleGame.player.lines >= singleGame.linesToWin
            ? [singleGame.player]
            : []
        : []
      : partyState?.stopOnFirstWin && partyState?.winnerRoomPlayerId
        ? (partyState.players ?? []).filter((player) => player.id === partyState.winnerRoomPlayerId)
        : (partyState?.players ?? []).filter((player) => player.lines >= partyState.linesToWin)
  const winnerIds = new Set(winners.map((winner) => winner.id))
  const gameLockedByWinner =
    mode === 'single'
      ? Boolean(singleGame?.stopOnFirstWin && singleGame?.winnerDeclared)
      : Boolean(partyState?.stopOnFirstWin && partyState?.winnerRoomPlayerId)
  const isInMultiplayerRoom = mode === 'multi' && Boolean(partyState && playerId && joinToken)
  const isHost = isInMultiplayerRoom && partyState?.hostPlayerId === playerId
  const showBoardSettings =
    mode === 'single' || (mode === 'multi' && ((isInMultiplayerRoom && isHost) || (!isInMultiplayerRoom && multiLobbyView === 'create')))
  const inviteLink = partyId ? `${window.location.origin}${window.location.pathname}?party=${partyId}` : ''
  const roomCode = partyState?.roomCode ?? ''

  const createSingleGame = () => {
    if (!playerName.trim()) {
      setErrorMessage(t('requiredPlayer'))
      return
    }

    if (parsedPhrases.length < boardSize * boardSize) {
      setErrorMessage(t('minPhrases', { size: boardSize, count: boardSize * boardSize }))
      return
    }

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
      stopOnFirstWin: endOnFirstWin,
      winnerDeclared: false,
      player: {
        id: 'solo',
        name: playerName.trim(),
        cells,
        lines: 0,
      },
    })
    setStatusMessage(t('boardCreated'))
    setErrorMessage('')
    if (isMobile) {
      requestAnimationFrame(() => openGamePanel())
    }
  }

  const createParty = async () => {
    setIsBusy(true)
    setErrorMessage('')
    try {
      if (!playerName.trim()) {
        setErrorMessage(t('requiredNick'))
        setIsBusy(false)
        return
      }

      if (!partyName.trim()) {
        setErrorMessage(t('requiredParty'))
        setIsBusy(false)
        return
      }

      if (parsedPhrases.length < boardSize * boardSize) {
        setErrorMessage(t('minPhrases', { size: boardSize, count: boardSize * boardSize }))
        setIsBusy(false)
        return
      }

      const data = await request('/parties', {
        method: 'POST',
        body: JSON.stringify({
          partyName: partyName.trim(),
          playerName: playerName.trim(),
          boardSize,
          linesToWin: clampLines(boardSize, linesToWin),
          stopOnFirstWin: endOnFirstWin,
          phrases: parsedPhrases,
        }),
      })

      setMode('multi')
      setPartyId(data.party.id)
      setPartyState(data.party)
      setPlayerId(data.playerId)
      setJoinToken(data.joinToken)
      setJoinInput('')
      setStoredPlayer(data.party.id, {
        playerId: data.playerId,
        joinToken: data.joinToken,
        name: playerName,
      })
      setStatusMessage(t('roomCreated', { code: data.party.roomCode }))
      if (isMobile) {
        requestAnimationFrame(() => openGamePanel())
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const loadParty = useCallback(async (nextPartyId, { silent = false } = {}) => {
    if (!silent) {
      setIsBusy(true)
      setErrorMessage('')
    }

    try {
      const query =
        playerId && joinToken
          ? `?playerId=${encodeURIComponent(playerId)}&joinToken=${encodeURIComponent(joinToken)}`
          : ''
      const data = await request(`/parties/${nextPartyId}${query}`)
      setPartyState((current) => {
        if (getPartySignature(current) === getPartySignature(data.party)) return current
        return data.party
      })
    } catch (error) {
      if (!silent) {
        setErrorMessage(error.message)
      }
    } finally {
      if (!silent) {
        setIsBusy(false)
      }
    }
  }, [joinToken, playerId])

  const joinPartyById = async (targetPartyId, forceNewPlayer = false) => {
    if (!targetPartyId) return
    try {
      const existingPlayer = getStoredPlayer(targetPartyId)
      if (!forceNewPlayer && existingPlayer?.playerId && existingPlayer?.joinToken) {
        setPlayerId(existingPlayer.playerId)
        setJoinToken(existingPlayer.joinToken)
        setPlayerName(existingPlayer.name)
        const data = await request(
          `/parties/${targetPartyId}?playerId=${encodeURIComponent(existingPlayer.playerId)}&joinToken=${encodeURIComponent(existingPlayer.joinToken)}`,
        )
        setPartyId(targetPartyId)
        setPartyState(data.party)
        setStatusMessage(t('rejoined'))
        if (isMobile) {
          requestAnimationFrame(() => openGamePanel())
        }
      } else {
        if (!playerName.trim()) {
          setErrorMessage(t('requiredNick'))
          return
        }
        if (forceNewPlayer) {
          clearStoredPlayer(targetPartyId)
        }
        const data = await request(`/parties/${targetPartyId}/join`, {
          method: 'POST',
          body: JSON.stringify({ playerName: playerName.trim() }),
        })
        setPartyId(targetPartyId)
        setPlayerId(data.playerId)
        setJoinToken(data.joinToken)
        setPartyState(data.party)
        setStoredPlayer(targetPartyId, {
          playerId: data.playerId,
          joinToken: data.joinToken,
          name: playerName,
        })
        setStatusMessage(t('joinedByLink'))
        if (isMobile) {
          requestAnimationFrame(() => openGamePanel())
        }
      }
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const resolvePartyIdFromInput = async (rawInput) => {
    const normalizedInput = String(rawInput || '').trim()
    if (!normalizedInput) return null

    try {
      const parsedAsUrl = new URL(normalizedInput, window.location.origin)
      const paramPartyId = parsedAsUrl.searchParams.get(PARTY_PARAM)
      if (paramPartyId) return paramPartyId
    } catch {
      // ignore and continue with code/uuid detection
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedInput)) {
      return normalizedInput
    }

    const code = sanitizeRoomCode(normalizedInput)
    if (!code) return null

    const data = await request(`/parties/code/${encodeURIComponent(code)}`)
    return data.partyId
  }

  const joinFromInput = async (forceNewPlayer = false) => {
    if (!joinInput.trim() && !partyId) {
      setErrorMessage(t('requiredJoinInput'))
      return
    }

    setIsBusy(true)
    setErrorMessage('')

    try {
      const targetPartyId = joinInput.trim()
        ? await resolvePartyIdFromInput(joinInput)
        : partyId

      if (!targetPartyId) {
        setErrorMessage(t('notFoundRoom'))
        setIsBusy(false)
        return
      }

      await joinPartyById(targetPartyId, forceNewPlayer)
      setJoinInput('')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const restartPartyBoard = async () => {
    if (!partyId || !playerId || !joinToken) return

    setIsBusy(true)
    setErrorMessage('')

    try {
      if (parsedPhrases.length < boardSize * boardSize) {
        setErrorMessage(t('minPhrases', { size: boardSize, count: boardSize * boardSize }))
        setIsBusy(false)
        return
      }

      const data = await request(`/parties/${partyId}/reset`, {
        method: 'POST',
        body: JSON.stringify({
          playerId,
          joinToken,
          partyName: partyName.trim() || partyState?.partyName || 'Nowe party',
          boardSize,
          linesToWin: clampLines(boardSize, linesToWin),
          stopOnFirstWin: endOnFirstWin,
          phrases: parsedPhrases,
        }),
      })

      setPartyState(data.party)
      setStatusMessage(t('boardRestarted'))
      if (isMobile) {
        requestAnimationFrame(() => openGamePanel())
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (mode !== 'multi' || !partyId) return
    loadParty(partyId)
  }, [mode, partyId, loadParty])

  useEffect(() => {
    if (mode !== 'multi' || !partyState) return
    setEndOnFirstWin(Boolean(partyState.stopOnFirstWin))
    setPartyName(partyState.partyName ?? 'Nowe party')
    setBoardSize(partyState.boardSize ?? 5)
    setLinesToWin(partyState.linesToWin ?? 2)
  }, [mode, partyState])

  useEffect(() => {
    if (mode !== 'multi' || !partyId || !playerId || !joinToken) return undefined
    const interval = window.setInterval(() => {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return
      }
      loadParty(partyId, { silent: true })
    }, 5000)
    return () => window.clearInterval(interval)
  }, [mode, partyId, playerId, joinToken, loadParty])

  const toggleSingleCell = (cellId) => {
    if (!singleGame) return
    if (singleGame.stopOnFirstWin && singleGame.winnerDeclared) return
    const nextCells = singleGame.player.cells.map((cell) =>
      cell.id === cellId ? { ...cell, marked: !cell.marked } : cell,
    )
    const nextLines = countLines(nextCells, singleGame.boardSize)
    const winnerDeclared = singleGame.winnerDeclared || nextLines >= singleGame.linesToWin
    setSingleGame({
      ...singleGame,
      winnerDeclared,
      player: {
        ...singleGame.player,
        cells: nextCells,
        lines: nextLines,
      },
    })
  }

  const togglePartyCell = async (cellId) => {
    if (!partyId || !playerId || !joinToken) return
    if (partyState?.stopOnFirstWin && partyState?.winnerRoomPlayerId) return

    if (partyState) {
      setPartyState((current) => {
        if (!current) return current

        const nextPlayers = current.players.map((player) => {
          if (player.id !== playerId) return player

          const nextCells = player.cells.map((cell) =>
            cell.id === cellId ? { ...cell, marked: !cell.marked } : cell,
          )

          return {
            ...player,
            cells: nextCells,
            lines: countLines(nextCells, current.boardSize),
          }
        })

        return {
          ...current,
          players: nextPlayers,
        }
      })
    }

    try {
      await request(`/parties/${partyId}/mark`, {
        method: 'POST',
        body: JSON.stringify({ playerId, joinToken, cellId }),
      })
      await loadParty(partyId, { silent: true })
    } catch (error) {
      setErrorMessage(error.message)
      await loadParty(partyId, { silent: true })
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setStatusMessage(t('linkCopied'))
    } catch {
      setStatusMessage(t('linkManual', { link: inviteLink }))
    }
  }

  const copyRoomCode = async () => {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setStatusMessage(t('codeCopied', { code: roomCode }))
    } catch {
      setStatusMessage(t('codeManual', { code: roomCode }))
    }
  }

  const openSettingsPanel = () => {
    if (!layoutRef.current) return
    layoutRef.current.scrollTo({ left: 0, behavior: 'smooth' })
  }

  const openGamePanel = () => {
    if (!layoutRef.current) return
    const container = layoutRef.current
    container.scrollTo({ left: container.clientWidth, behavior: 'smooth' })
  }

  const leaveParty = () => {
    setPartyState(null)
    setPartyId(null)
    setJoinInput('')
    setMultiLobbyView('join')
    setPlayerId(null)
    setJoinToken(null)
    setMode('single')
    setStatusMessage(t('switchedToSingle'))
    setErrorMessage('')
    setPartyInUrl(null)
  }

  const gameBoardSize = mode === 'single' ? singleGame?.boardSize : partyState?.boardSize
  const linesGoal = mode === 'single' ? singleGame?.linesToWin : partyState?.linesToWin

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">{t('appTitle')}</p>
          <h1>{t('appHero')}</h1>
        </div>

        <div className="topbar-actions">
          <div className="toggle-group" role="tablist" aria-label={t('modeLabel')}>
            <button
              type="button"
              className={mode === 'single' ? 'is-active' : ''}
              onClick={() => setMode('single')}
            >
              {t('modeSingle')}
            </button>
            <button
              type="button"
              className={mode === 'multi' ? 'is-active' : ''}
              onClick={() => setMode('multi')}
            >
              {t('modeMulti')}
            </button>
          </div>

          <div className="toggle-group" role="tablist" aria-label="Theme">
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              onClick={() => setTheme('light')}
            >
              {t('themeLight')}
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              onClick={() => setTheme('dark')}
            >
              {t('themeDark')}
            </button>
          </div>
        </div>
      </section>

      <section className="layout" ref={layoutRef}>
        <aside className="panel settings-panel">
          <div className="panel-header">
            <h2>{t('settingsTitle')}</h2>
            <p>
              {mode === 'single'
                ? t('settingsSingleDesc')
                : isInMultiplayerRoom
                  ? isHost
                    ? t('settingsMultiHostDesc')
                    : t('settingsMultiPlayerDesc')
                  : t('settingsMultiLobbyDesc')}
            </p>
          </div>

          <label className="field">
            <span>{mode === 'multi' ? t('labelPlayerMulti') : t('labelPlayerSingle')}</span>
            <input
              type="text"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder={locale === LOCALE_PL ? (mode === 'multi' ? 'Np. Tomek' : 'Np. Gracz 1') : (mode === 'multi' ? 'e.g. Alex' : 'e.g. Player 1')}
            />
          </label>

          {mode === 'multi' && !isInMultiplayerRoom && !isMobile ? (
            <div className="field">
              <span>{t('actionGroup')}</span>
              <div className="toggle-group">
                <button
                  type="button"
                  className={multiLobbyView === 'create' ? 'is-active' : ''}
                  onClick={() => setMultiLobbyView('create')}
                >
                  {t('actionCreate')}
                </button>
                <button
                  type="button"
                  className={multiLobbyView === 'join' ? 'is-active' : ''}
                  onClick={() => setMultiLobbyView('join')}
                >
                  {t('actionJoin')}
                </button>
              </div>
            </div>
          ) : null}

          {mode === 'multi' && showBoardSettings && !isInMultiplayerRoom ? (
            <label className="field">
              <span>{t('labelPartyName')}</span>
              <input
                type="text"
                value={partyName}
                onChange={(event) => setPartyName(event.target.value)}
                disabled={isBusy}
                placeholder={locale === LOCALE_PL ? 'Np. Wieczorne bingo' : 'e.g. Friday Bingo'}
              />
            </label>
          ) : null}

          {mode === 'multi' && !isInMultiplayerRoom && multiLobbyView === 'join' && !isMobile ? (
            <label className="field">
              <span>{t('labelRoomInput')}</span>
              <input
                type="text"
                value={joinInput}
                onChange={(event) => setJoinInput(event.target.value)}
                placeholder={t('roomInputPlaceholder')}
              />
              <small>{t('roomInputHint')}</small>
            </label>
          ) : null}

          {showBoardSettings ? (
            <div className="field">
              <span>{t('boardSize')}</span>
              <div className="size-grid">
                {BOARD_SIZES.map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={boardSize === size ? 'is-active' : ''}
                    disabled={!availableBoardSizes.includes(size)}
                    onClick={() => setBoardSize(size)}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
              <small>{t('boardSizeHint')}</small>
            </div>
          ) : null}

          {showBoardSettings ? (
            <label className="field">
              <span>{t('linesToWin')}</span>
              <input
                type="number"
                min="1"
                max={maxPossibleLines}
                value={linesToWin}
                onChange={(event) => setLinesToWin(Number(event.target.value) || 1)}
              />
              <small>{t('linesToWinHint', { max: maxPossibleLines, size: boardSize })}</small>
            </label>
          ) : null}

          {showBoardSettings ? (
            <div className="field">
              <span>{t('endGame')}</span>
              <label className="switch-control" htmlFor="end-on-first-win">
                <input
                  id="end-on-first-win"
                  type="checkbox"
                  checked={endOnFirstWin}
                  onChange={(event) => setEndOnFirstWin(event.target.checked)}
                />
                <span>{t('endGameSwitch')}</span>
              </label>
              <small>
                {endOnFirstWin
                  ? t('endGameOnHint')
                  : t('endGameOffHint')}
              </small>
            </div>
          ) : null}

          {showBoardSettings ? (
            <label className="field">
              <span>{t('phrases')}</span>
              <textarea
                rows="12"
                value={phrasesText}
                onChange={(event) => setPhrasesText(event.target.value)}
                placeholder={phrasesPlaceholder}
              />
              <small>
                {t('phrasesHint')}
              </small>
            </label>
          ) : null}

          {mode === 'single' ? (
            <div className="actions">
              <button
                type="button"
                className="primary-button"
                onClick={createSingleGame}
                disabled={!canCreateForSelectedSize || !canUsePlayerName}
              >
                {t('singleCreate')}
              </button>
            </div>
          ) : (
            <div className="actions actions-stack">
              {isInMultiplayerRoom ? (
                <>
                  {isHost ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={restartPartyBoard}
                      disabled={isBusy || !canCreateForSelectedSize}
                    >
                      {t('restartRoomBoard')}
                    </button>
                  ) : (
                    <button type="button" className="secondary-button" onClick={leaveParty}>
                      {t('leaveRoom')}
                    </button>
                  )}
                  {partyId ? (
                    <button type="button" className="secondary-button" onClick={copyInviteLink}>
                      {t('copyLink')}
                    </button>
                  ) : null}
                  {roomCode ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={copyRoomCode}
                    >
                      {t('copyCode', { code: roomCode })}
                    </button>
                  ) : null}
                  {isHost ? (
                    <button type="button" className="secondary-button" onClick={leaveParty}>
                      {t('leaveRoom')}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  {multiLobbyView === 'create' ? (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={createParty}
                        disabled={isBusy || !canCreateForSelectedSize || !canUsePlayerName || !canUsePartyName}
                      >
                        {t('multiCreateRoom')}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setMultiLobbyView('join')}
                      >
                        {t('multiGoJoin')}
                      </button>
                    </>
                  ) : null}
                  {multiLobbyView === 'join' ? (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => joinFromInput(false)}
                        disabled={isBusy || !canUsePlayerName || (!joinInput.trim() && !partyId)}
                      >
                        {t('multiJoinRoom')}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => joinFromInput(true)}
                        disabled={isBusy || (!joinInput.trim() && !partyId)}
                      >
                        {t('multiJoinAsNew')}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setMultiLobbyView('create')}
                      >
                        {t('multiGoCreate')}
                      </button>
                    </>
                  ) : null}
                </>
              )}
              {(partyState || partyId) && !isInMultiplayerRoom ? (
                <button type="button" className="secondary-button" onClick={leaveParty}>
                  {t('leavePreview')}
                </button>
              ) : null}
            </div>
          )}

          {statusMessage && !isInMultiplayerRoom ? <p className="status-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        </aside>

        <section className="board-stage">
          <div className="stage-header">
            <div>
              <p className="eyebrow">{t('gameMenu')}</p>
              <h2>
                {mode === 'single'
                  ? singleGame
                    ? t('stageTitleSingleReady')
                    : t('stageTitleSingleEmpty')
                  : partyState?.partyName ?? partyName}
              </h2>
            </div>
            <div className="summary-card">
              <span>{t('modeLabel')}</span>
              <strong>{mode === 'multi' ? t('modeMulti') : t('modeSingle')}</strong>
              <span>{t('goalLabel')}</span>
              <strong>{t('goalLines', { count: linesGoal ?? linesToWin })}</strong>
            </div>
          </div>

          {isMobile && !isInMultiplayerRoom && !currentPlayer ? (
            <div className="mobile-lobby-card">
              <div className="toggle-group">
                <button
                  type="button"
                  className={mode === 'single' ? 'is-active' : ''}
                  onClick={() => setMode('single')}
                >
                  Single
                </button>
                <button
                  type="button"
                  className={mode === 'multi' ? 'is-active' : ''}
                  onClick={() => setMode('multi')}
                >
                  Multi
                </button>
              </div>

              {mode === 'single' ? (
                <div className="mobile-lobby-content">
                  <p className="mobile-hint">
                    {t('mobileSingleHint')}
                  </p>
                  <button type="button" className="primary-button" onClick={openSettingsPanel}>
                    {t('mobileOpenSingle')}
                  </button>
                </div>
              ) : null}

              {mode === 'multi' ? (
                <>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={multiLobbyView === 'join' ? 'is-active' : ''}
                      onClick={() => setMultiLobbyView('join')}
                    >
                      {t('actionJoin')}
                    </button>
                    <button
                      type="button"
                      className={multiLobbyView === 'create' ? 'is-active' : ''}
                      onClick={() => setMultiLobbyView('create')}
                    >
                      {t('actionCreate')}
                    </button>
                  </div>

                  {multiLobbyView === 'join' ? (
                    <div className="mobile-lobby-content">
                      <label className="field">
                        <span>{t('labelRoomInput')}</span>
                        <input
                          type="text"
                          value={joinInput}
                          onChange={(event) => setJoinInput(event.target.value)}
                          placeholder={t('roomInputPlaceholder')}
                        />
                      </label>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => joinFromInput(false)}
                        disabled={isBusy || (!joinInput.trim() && !partyId)}
                      >
                        {t('multiJoinRoom')}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => joinFromInput(true)}
                        disabled={isBusy || !canUsePlayerName || (!joinInput.trim() && !partyId)}
                      >
                        {t('multiJoinAsNew')}
                      </button>
                    </div>
                  ) : (
                    <div className="mobile-lobby-content">
                      <p className="mobile-hint">
                        {t('mobileCreateHint')}
                      </p>
                      <button type="button" className="primary-button" onClick={openSettingsPanel}>
                        {t('mobileOpenCreate')}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          ) : null}

          {mode === 'multi' && !isInMultiplayerRoom ? (
            <div className="network-card">
              <div>
                <span className="network-label">{t('networkLink')}</span>
                <strong>{inviteLink || '-'}</strong>
              </div>
              <div>
                <span className="network-label">{t('networkCode')}</span>
                <strong>{roomCode || '-'}</strong>
              </div>
              <div>
                <span className="network-label">{t('networkStatus')}</span>
                <strong>
                  {partyState
                    ? t('networkStatusPlayers', { count: partyState.players.length })
                    : t('networkStatusWaiting')}
                </strong>
              </div>
            </div>
          ) : null}

          {currentPlayer && gameBoardSize ? (
            <>
              <div className="board-meta">
                <p>
                  {t('playerBoard', { name: currentPlayer.name })}
                </p>
                <p>
                  {t('playerLines', { lines: currentPlayer.lines, goal: linesGoal })}
                </p>
                {mode === 'multi' ? (
                  <p>
                    {t('privateBoardHint')}
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
                    disabled={gameLockedByWinner}
                    onClick={() =>
                      mode === 'single' ? toggleSingleCell(cell.id) : togglePartyCell(cell.id)
                    }
                  >
                    <span>{cell.label}</span>
                    {cell.marked ? <i aria-hidden="true" className="marker-circle" /> : null}
                  </button>
                ))}
              </div>

              {winners.length > 0 ? (
                <div className="winner-banner" aria-live="polite">
                  <span>
                    {gameLockedByWinner
                      ? t('winnerFinalPrefix', { names: winners.map((winner) => winner.name).join(', ') })
                      : t('winnerPrefix', { names: winners.map((winner) => winner.name).join(', ') })}
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <p>
                {mode === 'single'
                  ? t('emptySingle')
                  : t('emptyMulti')}
              </p>
              <small>{t('emptyHint')}</small>
            </div>
          )}
        </section>

        <aside className="panel leaderboard-panel">
          <div className="panel-header">
            <h2>{t('leaderboardTitle')}</h2>
            <p>{t('leaderboardHint')}</p>
          </div>

          {leaderboard.length > 0 ? (
            <div className="leaderboard-list">
              {leaderboard.map((player, index) => (
                <div
                  className={`leaderboard-row ${winnerIds.has(player.id) ? 'is-winner' : ''}`}
                  key={player.id}
                >
                  <div>
                    <span className="leaderboard-rank">#{index + 1}</span>
                    <strong>{player.name}</strong>
                    {winnerIds.has(player.id) ? <span className="winner-tag">{t('winnerBadge')}</span> : null}
                  </div>
                  <div className="leaderboard-score">
                    <strong>{player.lines}</strong>
                    <span>{t('linesUnit')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-side-card">
              <p>{t('leaderboardEmpty')}</p>
            </div>
          )}

          {!isInMultiplayerRoom ? (
            <div className="side-note">
              <strong>{t('onlineInfoTitle')}</strong>
              <p>{t('onlineInfoText')}</p>
            </div>
          ) : null}
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
    if (done) total += 1
  }

  for (let column = 0; column < size; column += 1) {
    const done = Array.from({ length: size }, (_, row) => cells[row * size + column]).every(
      (cell) => marked.has(cell.id),
    )
    if (done) total += 1
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
