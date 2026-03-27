import { createBoardForPlayer, createJoinToken, getPartyForViewer } from '../_lib/game.js'
import { sendError, sendJson, supabase } from '../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const { partyName, playerName, boardSize, linesToWin, phrases } = request.body ?? {}

    if (!Array.isArray(phrases) || phrases.length < Number(boardSize) * Number(boardSize)) {
      sendError(response, 400, 'Za malo hasel do stworzenia planszy.')
      return
    }

    const safeBoardSize = Number(boardSize) || 5
    const safeLinesToWin = Number(linesToWin) || 2

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: String(partyName || 'Nowe party'),
        board_size: safeBoardSize,
        lines_to_win: safeLinesToWin,
      })
      .select()
      .single()

    if (roomError) throw roomError

    const joinToken = createJoinToken()
    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        display_name: String(playerName || 'Gracz 1'),
        join_token: joinToken,
      })
      .select()
      .single()

    if (playerError) throw playerError

    await createBoardForPlayer({
      roomPlayerId: player.id,
      boardSize: safeBoardSize,
      phrases,
    })

    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ host_player_id: player.id })
      .eq('id', room.id)

    if (roomUpdateError) throw roomUpdateError

    const party = await getPartyForViewer(room.id, player.id)
    sendJson(response, 201, {
      party,
      playerId: player.id,
      joinToken,
    })
  } catch (error) {
    console.error('POST /api/parties failed:', error)
    sendError(response, 500, error.message || 'Failed to create room')
  }
}
