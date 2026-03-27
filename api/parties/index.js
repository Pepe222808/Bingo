import { createBoardForPlayer, createJoinToken, getPartyForViewer } from '../_lib/game.js'
import { sendError, sendJson, supabase } from '../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const { partyName, playerName, boardSize, linesToWin, stopOnFirstWin, phrases } = request.body ?? {}
    const safePartyName = String(partyName ?? '').trim()
    const safePlayerName = String(playerName ?? '').trim()

    if (!Array.isArray(phrases) || phrases.length < Number(boardSize) * Number(boardSize)) {
      sendError(response, 400, 'Za malo hasel do stworzenia planszy.')
      return
    }

    if (!safePartyName) {
      sendError(response, 400, 'Podaj nazwe pokoju.')
      return
    }

    if (!safePlayerName) {
      sendError(response, 400, 'Podaj nick gracza.')
      return
    }

    const safeBoardSize = Number(boardSize) || 5
    const safeLinesToWin = Number(linesToWin) || 2

    const baseRoomPayload = {
      name: safePartyName,
      board_size: safeBoardSize,
      lines_to_win: safeLinesToWin,
    }

    let room = null
    let roomError = null
    const insertWithStop = await supabase
      .from('rooms')
      .insert({
        ...baseRoomPayload,
        stop_on_first_winner: Boolean(stopOnFirstWin),
      })
      .select()
      .single()

    room = insertWithStop.data
    roomError = insertWithStop.error

    const missingStopColumn =
      roomError && String(roomError.message || '').includes('stop_on_first_winner')

    if (missingStopColumn) {
      const fallbackInsert = await supabase
        .from('rooms')
        .insert(baseRoomPayload)
        .select()
        .single()
      room = fallbackInsert.data
      roomError = fallbackInsert.error
    }

    if (roomError || !room) throw roomError || new Error('Nie udalo sie utworzyc pokoju.')

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
