import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import process from 'node:process'

const PORT = Number(process.env.PORT || 3001)
const parties = new Map()

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })

    request.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Niepoprawny JSON.'))
      }
    })

    request.on('error', reject)
  })
}

function shuffle(items) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
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

function createBoard(phrases, boardSize) {
  return shuffle(phrases)
    .slice(0, boardSize * boardSize)
    .map((label, index) => ({
      id: randomUUID(),
      label,
      marked: false,
      position: index,
    }))
}

function sanitizeParty(party) {
  return {
    id: party.id,
    partyName: party.partyName,
    boardSize: party.boardSize,
    linesToWin: party.linesToWin,
    createdAt: party.createdAt,
    players: party.players.map((player) => ({
      id: player.id,
      name: player.name,
      lines: player.lines,
      cells: player.cells,
    })),
  }
}

function broadcastParty(party) {
  const payload = `data: ${JSON.stringify({ party: sanitizeParty(party) })}\n\n`

  for (const client of party.clients) {
    client.write(payload)
  }
}

function addPlayerToParty(party, playerName) {
  const safeName = String(playerName || '').trim() || `Gracz ${party.players.length + 1}`
  const cells = createBoard(party.phrases, party.boardSize)

  const player = {
    id: randomUUID(),
    name: safeName,
    cells,
    lines: countLines(cells, party.boardSize),
  }

  party.players.push(player)
  return player
}

const server = createServer(async (request, response) => {
  setCorsHeaders(response)

  if (!request.url) {
    sendJson(response, 404, { error: 'Brak adresu.' })
    return
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)
  const pathParts = url.pathname.split('/').filter(Boolean)

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/parties') {
      const body = await parseBody(request)
      const boardSize = Number(body.boardSize) || 5
      const linesToWin = Number(body.linesToWin) || 2
      const phrases = Array.isArray(body.phrases) ? body.phrases.slice(0, 200) : []

      if (phrases.length < boardSize * boardSize) {
        sendJson(response, 400, { error: 'Za malo hasel do stworzenia planszy.' })
        return
      }

      const party = {
        id: randomUUID().slice(0, 8),
        partyName: String(body.partyName || 'Nowe party'),
        boardSize,
        linesToWin,
        phrases,
        createdAt: Date.now(),
        players: [],
        clients: new Set(),
      }

      const host = addPlayerToParty(party, body.playerName)
      parties.set(party.id, party)

      sendJson(response, 201, {
        party: sanitizeParty(party),
        playerId: host.id,
      })
      return
    }

    if (pathParts[0] === 'api' && pathParts[1] === 'parties' && pathParts[2]) {
      const party = parties.get(pathParts[2])

      if (!party) {
        sendJson(response, 404, { error: 'Nie znaleziono pokoju.' })
        return
      }

      if (request.method === 'GET' && pathParts.length === 3) {
        sendJson(response, 200, { party: sanitizeParty(party) })
        return
      }

      if (request.method === 'POST' && pathParts[3] === 'join') {
        const body = await parseBody(request)
        const player = addPlayerToParty(party, body.playerName)
        broadcastParty(party)

        sendJson(response, 201, {
          party: sanitizeParty(party),
          playerId: player.id,
        })
        return
      }

      if (request.method === 'POST' && pathParts[3] === 'mark') {
        const body = await parseBody(request)
        const player = party.players.find((entry) => entry.id === body.playerId)

        if (!player) {
          sendJson(response, 404, { error: 'Nie znaleziono gracza w tym pokoju.' })
          return
        }

        player.cells = player.cells.map((cell) =>
          cell.id === body.cellId ? { ...cell, marked: !cell.marked } : cell,
        )
        player.lines = countLines(player.cells, party.boardSize)
        broadcastParty(party)

        sendJson(response, 200, { party: sanitizeParty(party) })
        return
      }

      if (request.method === 'GET' && pathParts[3] === 'stream') {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })
        response.write(`data: ${JSON.stringify({ party: sanitizeParty(party) })}\n\n`)

        party.clients.add(response)

        request.on('close', () => {
          party.clients.delete(response)
        })
        return
      }
    }

    sendJson(response, 404, { error: 'Nie znaleziono endpointu.' })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Wewnętrzny blad serwera.',
    })
  }
})

server.listen(PORT, () => {
  console.log(`Bingo server listening on http://localhost:${PORT}`)
})
