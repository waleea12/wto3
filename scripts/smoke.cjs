const assert = require('node:assert/strict')
const { io } = require('../apps/web/node_modules/socket.io-client')

const base = process.env.SMOKE_SERVER_URL || 'http://127.0.0.1:4500'
const runId = `smoke-${Date.now()}`
const password = `Test-${runId}-password`

async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(data)}`)
  return data
}

function waitFor(socket, event, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeout)
    socket.once(event, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

async function connect(token) {
  const socket = io(base, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { Origin: 'https://wto3-web.vercel.app' },
  })
  await Promise.race([waitFor(socket, 'connect'), waitFor(socket, 'connect_error').then((e) => { throw e })])
  return socket
}

async function main() {
  const users = await Promise.all([1, 2].map((i) => api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: `Smoke ${i}`, email: `${runId}-${i}@example.invalid`, password }),
  })))
  const logins = await Promise.all([1, 2].map((i) => api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: `${runId}-${i}@example.invalid`, password }),
  })))
  assert.equal(logins[0].user.id, users[0].user.id)
  const room = await api('/api/rooms', {
    method: 'POST', headers: { authorization: `Bearer ${logins[0].token}` }, body: '{}',
  })
  await api(`/api/rooms/${room.slug}/join`, {
    method: 'POST', headers: { authorization: `Bearer ${logins[1].token}` }, body: '{}',
  })
  const info = await api(`/api/rooms/${room.slug}`, {
    headers: { authorization: `Bearer ${logins[0].token}` },
  })
  assert.equal(info.participants.length, 2)

  const host = await connect(logins[0].token)
  const guest = await connect(logins[1].token)
  try {
    const join = (socket) => new Promise((resolve) => socket.emit('join_room', { roomSlug: room.slug, token: '', driveToken: '' }, resolve))
    const [hostState, guestState] = await Promise.all([join(host), join(guest)])
    assert.equal(hostState.isHost, true)
    assert.equal(guestState.isHost, false)

    const receivedChat = waitFor(host, 'chat_message')
    guest.emit('chat_message', { message: `hello-${runId}` })
    assert.equal((await receivedChat).message, `hello-${runId}`)

    const changed = waitFor(guest, 'change_video')
    host.emit('change_video', { videoId: 'dQw4w9WgXcQ', source: 'youtube', title: 'Smoke video' })
    assert.equal((await changed).videoId, 'dQw4w9WgXcQ')

    const played = waitFor(guest, 'play')
    host.emit('play', { currentTime: 12, serverTimestamp: Date.now() })
    assert.equal((await played).currentTime, 12)

    const paused = waitFor(guest, 'pause')
    host.emit('pause', { currentTime: 13, serverTimestamp: Date.now() })
    assert.equal((await paused).currentTime, 13)

    const movieChanged = waitFor(guest, 'change_video')
    host.emit('change_video', { videoId: 'movie:550', source: 'movie', title: 'Test movie' })
    assert.equal((await movieChanged).videoId, 'movie:550')
    const episodeChanged = waitFor(guest, 'change_video')
    host.emit('change_video', { videoId: 'tv:1396:1:1', source: 'movie', title: 'Test series' })
    assert.equal((await episodeChanged).videoId, 'tv:1396:1:1')

    const episodePlay = waitFor(guest, 'play')
    host.emit('play', { currentTime: 35, serverTimestamp: Date.now() })
    assert.equal((await episodePlay).currentTime, 35)

    host.emit('change_video', { videoId: 'https://untrusted.example/movie/1', source: 'movie', title: 'Invalid' })
    await new Promise((resolve) => setTimeout(resolve, 200))
    const current = await api(`/api/rooms/${room.slug}`, {
      headers: { authorization: `Bearer ${logins[0].token}` },
    })
    assert.equal(current.currentVideo, 'tv:1396:1:1')

    console.log(`PASS registration, login, room, two sockets, chat, movie and episode selection, play/pause; test prefix: ${runId}`)
  } finally {
    host.disconnect()
    guest.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
