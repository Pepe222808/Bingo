import { createBoardForPlayer, getPartyForViewer } from '../../_lib/game.js'
import { sendError, sendJson, supabase } from '../../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const { partyId } = request.query
    const { playerId, joinToken, partyName, boardSize, linesToWin, stopOnFirstWin, phrases } = request.body ?? {}

    if (!playerId || !joinToken) {
      sendError(response, 400, 'Missing player session data.')
      return
    }

    if (!Array.isArray(phrases) || phrases.length < Number(boardSize) * Number(boardSize)) {
      sendError(response, 400, 'Za malo hasel do stworzenia planszy.')
      return
    }

    const safeBoardSize = Number(boardSize) || 5
    const safeLinesToWin = Number(linesToWin) || 2

    const { data: hostPlayer, error: hostPlayerError } = await supabase
      .from('room_players')
      .select('id, room_id')
      .eq('id', playerId)
      .eq('room_id', partyId)
      .eq('join_token', joinToken)
      .single()

    if (hostPlayerError || !hostPlayer) {
      sendError(response, 403, 'Invalid player session.')
      return
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_player_id')
      .eq('id', partyId)
      .single()

    if (roomError || !room) {
      sendError(response, 404, 'Nie znaleziono pokoju.')
      return
    }

    if (room.host_player_id !== hostPlayer.id) {
      sendError(response, 403, 'Tylko host moze rozpoczec nowa tablice.')
      return
    }

    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)

    if (playersError) throw playersError

    const playerIds = players.map((player) => player.id)

    const { error: deleteBoardsError } = await supabase
      .from('player_boards')
      .delete()
      .in('room_player_id', playerIds.length > 0 ? playerIds : ['00000000-0000-0000-0000-000000000000'])

    if (deleteBoardsError) throw deleteBoardsError

    for (const player of players) {
      await createBoardForPlayer({
        roomPlayerId: player.id,
        boardSize: safeBoardSize,
        phrases,
      })
    }

    const { error: roomPlayersResetError } = await supabase
      .from('room_players')
      .update({
        lines: 0,
        last_modified_by: hostPlayer.id,
      })
      .eq('room_id', room.id)

    if (roomPlayersResetError) throw roomPlayersResetError

    const baseRoomUpdate = {
      name: String(partyName || 'Nowe party'),
      board_size: safeBoardSize,
      lines_to_win: safeLinesToWin,
      winner_room_player_id: null,
      winner_declared_at: null,
    }

    let roomUpdateError = null
    const updateWithStop = await supabase
      .from('rooms')
      .update({
        ...baseRoomUpdate,
        stop_on_first_winner: Boolean(stopOnFirstWin),
      })
      .eq('id', room.id)

    roomUpdateError = updateWithStop.error

    const missingStopColumn =
      roomUpdateError && String(roomUpdateError.message || '').includes('stop_on_first_winner')

    if (missingStopColumn) {
      const fallbackUpdate = await supabase
        .from('rooms')
        .update(baseRoomUpdate)
        .eq('id', room.id)
      roomUpdateError = fallbackUpdate.error
    }

    if (roomUpdateError) throw roomUpdateError

    const party = await getPartyForViewer(room.id, hostPlayer.id)
    sendJson(response, 200, { party })
  } catch (error) {
    console.error('POST /api/parties/[partyId]/reset failed:', error)
    sendError(response, 500, error.message || 'Failed to reset room')
  }
}
