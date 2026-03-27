import { getPartyForViewer } from '../../_lib/game.js'
import { sendError, sendJson, supabase } from '../../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const { partyId } = request.query
    const playerId = request.query.playerId ? String(request.query.playerId) : null
    const joinToken = request.query.joinToken ? String(request.query.joinToken) : null

    if (!partyId) {
      sendError(response, 400, 'Missing party id.')
      return
    }

    if (playerId && joinToken) {
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

      const party = await getPartyForViewer(String(partyId), player.id)
      if (!party) {
        sendError(response, 404, 'Nie znaleziono pokoju.')
        return
      }

      sendJson(response, 200, { party })
      return
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, board_size, lines_to_win')
      .eq('id', partyId)
      .single()

    if (roomError || !room) {
      sendError(response, 404, 'Nie znaleziono pokoju.')
      return
    }

    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('id, display_name, lines')
      .eq('room_id', partyId)

    if (playersError) throw playersError

    sendJson(response, 200, {
      party: {
        id: room.id,
        partyName: room.name,
        boardSize: room.board_size,
        linesToWin: room.lines_to_win,
        players: players.map((player) => ({
          id: player.id,
          name: player.display_name,
          lines: player.lines,
          cells: [],
        })),
      },
    })
  } catch (error) {
    console.error('GET /api/parties/[partyId] failed:', error)
    sendError(response, 500, error.message || 'Failed to fetch room')
  }
}
