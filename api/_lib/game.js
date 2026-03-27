import { randomUUID } from 'node:crypto'
import { supabase } from './supabase.js'

export function shuffle(items) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

export function countLines(cells, size) {
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

export async function createBoardForPlayer({ roomPlayerId, boardSize, phrases }) {
  const { data: board, error: boardError } = await supabase
    .from('player_boards')
    .insert({
      room_player_id: roomPlayerId,
      board_size: boardSize,
    })
    .select()
    .single()

  if (boardError) throw boardError

  const labels = shuffle(phrases).slice(0, boardSize * boardSize)
  const cellsPayload = labels.map((label, position) => ({
    board_id: board.id,
    label,
    position,
    marked: false,
  }))

  const { error: cellsError } = await supabase.from('board_cells').insert(cellsPayload)
  if (cellsError) throw cellsError

  return board
}

export async function getPartyForViewer(roomId, viewerPlayerId) {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (roomError || !room) {
    return null
  }

  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('id, display_name, lines')
    .eq('room_id', roomId)

  if (playersError) throw playersError

  const playerIds = players.map((player) => player.id)
  const { data: boards, error: boardsError } = await supabase
    .from('player_boards')
    .select('id, room_player_id')
    .in('room_player_id', playerIds.length > 0 ? playerIds : ['00000000-0000-0000-0000-000000000000'])

  if (boardsError) throw boardsError

  const boardIds = boards.map((board) => board.id)
  const { data: cells, error: cellsError } = await supabase
    .from('board_cells')
    .select('id, board_id, label, position, marked')
    .in('board_id', boardIds.length > 0 ? boardIds : ['00000000-0000-0000-0000-000000000000'])
    .order('position', { ascending: true })

  if (cellsError) throw cellsError

  const boardByPlayerId = new Map(boards.map((board) => [board.room_player_id, board]))
  const cellsByBoardId = new Map()

  for (const cell of cells) {
    const bucket = cellsByBoardId.get(cell.board_id) ?? []
    bucket.push(cell)
    cellsByBoardId.set(cell.board_id, bucket)
  }

  const playersView = players
    .map((player) => {
      const playerBoard = boardByPlayerId.get(player.id)
      const playerCells = playerBoard ? cellsByBoardId.get(playerBoard.id) ?? [] : []

      return {
        id: player.id,
        name: player.display_name,
        lines: player.lines,
        cells: player.id === viewerPlayerId ? playerCells : [],
      }
    })
    .sort((a, b) => b.lines - a.lines)

  return {
    id: room.id,
    partyName: room.name,
    roomCode: getRoomCodeFromPartyId(room.id),
    hostPlayerId: room.host_player_id,
    boardSize: room.board_size,
    linesToWin: room.lines_to_win,
    stopOnFirstWin: Boolean(room.stop_on_first_winner),
    winnerRoomPlayerId: room.winner_room_player_id,
    winnerDeclaredAt: room.winner_declared_at,
    players: playersView,
  }
}

export function createJoinToken() {
  return randomUUID().replace(/-/g, '')
}

export function getRoomCodeFromPartyId(partyId) {
  return String(partyId ?? '')
    .replace(/-/g, '')
    .slice(0, 6)
    .toUpperCase()
}
