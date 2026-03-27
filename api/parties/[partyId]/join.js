import { createBoardForPlayer, createJoinToken, getPartyForViewer } from '../../_lib/game.js'
import { sendError, sendJson, supabase } from '../../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const { partyId } = request.query
    const { playerName } = request.body ?? {}
    const safePlayerName = String(playerName ?? '').trim()

    if (!safePlayerName) {
      sendError(response, 400, 'Podaj nick gracza.')
      return
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, board_size')
      .eq('id', partyId)
      .single()

    if (roomError || !room) {
      sendError(response, 404, 'Nie znaleziono pokoju.')
      return
    }

    const joinToken = createJoinToken()
    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        display_name: safePlayerName,
        join_token: joinToken,
      })
      .select()
      .single()

    if (playerError) throw playerError

    const { data: existingPlayers, error: existingPlayersError } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)

    if (existingPlayersError) throw existingPlayersError

    const existingPlayerIds = existingPlayers.map((entry) => entry.id)
    const { data: existingBoards, error: existingBoardsError } = await supabase
      .from('player_boards')
      .select('id')
      .in('room_player_id', existingPlayerIds.length > 0 ? existingPlayerIds : ['00000000-0000-0000-0000-000000000000'])

    if (existingBoardsError) throw existingBoardsError

    const existingBoardIds = existingBoards.map((entry) => entry.id)
    const { data: phraseRows, error: phraseError } = await supabase
      .from('board_cells')
      .select('label')
      .in('board_id', existingBoardIds.length > 0 ? existingBoardIds : ['00000000-0000-0000-0000-000000000000'])

    if (phraseError) throw phraseError

    const phrases = [...new Set((phraseRows ?? []).map((row) => row.label))]
    if (phrases.length < room.board_size * room.board_size) {
      sendError(response, 400, 'Brakuje puli hasel do wygenerowania planszy.')
      return
    }

    await createBoardForPlayer({
      roomPlayerId: player.id,
      boardSize: room.board_size,
      phrases,
    })

    const party = await getPartyForViewer(room.id, player.id)
    sendJson(response, 201, {
      party,
      playerId: player.id,
      joinToken,
    })
  } catch (error) {
    console.error('POST /api/parties/[partyId]/join failed:', error)
    sendError(response, 500, error.message || 'Failed to join room')
  }
}
