import { getRoomCodeFromPartyId } from '../../_lib/game.js'
import { sendError, sendJson, supabase } from '../../_lib/supabase.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    sendError(response, 405, 'Method not allowed')
    return
  }

  try {
    const code = String(request.query.code || '').toUpperCase().trim()

    if (!code) {
      sendError(response, 400, 'Missing room code.')
      return
    }

    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error || !rooms) {
      sendError(response, 500, 'Nie udalo sie pobrac listy pokoi.')
      return
    }

    const matches = rooms.filter((room) => getRoomCodeFromPartyId(room.id).startsWith(code))

    if (matches.length === 0) {
      sendError(response, 404, 'Nie znaleziono pokoju o tym kodzie.')
      return
    }

    if (matches.length > 1) {
      sendError(response, 409, 'Kod jest niejednoznaczny. Uzyj pelnego linku zaproszenia.')
      return
    }

    const [room] = matches

    sendJson(response, 200, {
      partyId: room.id,
      partyName: room.name,
      roomCode: getRoomCodeFromPartyId(room.id),
    })
  } catch (error) {
    console.error('GET /api/parties/code/[code] failed:', error)
    sendError(response, 500, error.message || 'Failed to find room by code')
  }
}
