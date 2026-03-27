import { countLines, getPartyForViewer } from '../../_lib/game.js'
import { sendError, sendJson, supabase } from '../../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const { partyId } = request.query
    const { playerId, joinToken, cellId } = request.body ?? {}

    if (!playerId || !joinToken || !cellId) {
      sendError(response, 400, 'Missing player/session/cell data.')
      return
    }

    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .select('id, room_id')
      .eq('id', playerId)
      .eq('room_id', partyId)
      .eq('join_token', joinToken)
      .single()

    if (playerError || !player) {
      sendError(response, 403, 'Invalid player session.')
      return
    }

    const { data: board, error: boardError } = await supabase
      .from('player_boards')
      .select('id, board_size')
      .eq('room_player_id', player.id)
      .single()

    if (boardError || !board) {
      sendError(response, 404, 'Nie znaleziono planszy gracza.')
      return
    }

    const { data: currentCell, error: cellError } = await supabase
      .from('board_cells')
      .select('id, marked')
      .eq('id', cellId)
      .eq('board_id', board.id)
      .single()

    if (cellError || !currentCell) {
      sendError(response, 404, 'Nie znaleziono pola planszy.')
      return
    }

    const { error: updateCellError } = await supabase
      .from('board_cells')
      .update({
        marked: !currentCell.marked,
        last_modified_by: player.id,
      })
      .eq('id', currentCell.id)
      .eq('board_id', board.id)

    if (updateCellError) throw updateCellError

    const { data: allCells, error: allCellsError } = await supabase
      .from('board_cells')
      .select('id, marked, position')
      .eq('board_id', board.id)
      .order('position', { ascending: true })

    if (allCellsError) throw allCellsError

    const lines = countLines(allCells, board.board_size)
    const { error: linesError } = await supabase
      .from('room_players')
      .update({
        lines,
        last_modified_by: player.id,
      })
      .eq('id', player.id)

    if (linesError) throw linesError

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', partyId)
      .single()

    if (roomError || !room) {
      sendError(response, 404, 'Nie znaleziono pokoju.')
      return
    }

    if (Boolean(room.stop_on_first_winner) && room.winner_room_player_id) {
      const party = await getPartyForViewer(room.id, player.id)
      sendJson(response, 409, { error: 'Gra zakonczona po pierwszym zwyciezcy.', party })
      return
    }

    if (!room.winner_room_player_id && lines >= room.lines_to_win) {
      const { error: winnerError } = await supabase
        .from('rooms')
        .update({
          winner_room_player_id: player.id,
          winner_declared_at: new Date().toISOString(),
        })
        .eq('id', room.id)

      if (winnerError) throw winnerError
    }

    const party = await getPartyForViewer(room.id, player.id)
    sendJson(response, 200, { party })
  } catch (error) {
    console.error('POST /api/parties/[partyId]/mark failed:', error)
    sendError(response, 500, error.message || 'Failed to mark cell')
  }
}
