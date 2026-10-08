const assert = require('node:assert/strict')

const web = process.env.SMOKE_WEB_URL || 'https://wto3-web.vercel.app'
const api = process.env.SMOKE_SERVER_URL || 'https://wto3-api.84.13.157.157.sslip.io'
const prefix = `web-smoke-${Date.now()}`
const email = `${prefix}@example.invalid`
const password = `Test-${prefix}-password`
const cookies = new Map()

function remember(response) {
  for (const entry of response.headers.getSetCookie()) {
    const pair = entry.split(';', 1)[0]
    const separator = pair.indexOf('=')
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
  }
}

function cookieHeader() {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
}

async function main() {
  const registered = await fetch(`${api}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Web Smoke', email, password }),
  })
  assert.ok([200, 201].includes(registered.status), `registration returned ${registered.status}`)
  const { user } = await registered.json()

  const csrfResponse = await fetch(`${web}/api/auth/csrf`)
  remember(csrfResponse)
  assert.equal(csrfResponse.status, 200)
  const { csrfToken } = await csrfResponse.json()
  assert.ok(csrfToken)

  const form = new URLSearchParams({ csrfToken, email, password, callbackUrl: `${web}/`, json: 'true' })
  const loginResponse = await fetch(`${web}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHeader() },
    body: form,
    redirect: 'manual',
  })
  remember(loginResponse)
  assert.ok([200, 302].includes(loginResponse.status), `NextAuth returned ${loginResponse.status}`)

  const sessionResponse = await fetch(`${web}/api/auth/session`, { headers: { cookie: cookieHeader() } })
  assert.equal(sessionResponse.status, 200)
  const session = await sessionResponse.json()
  assert.equal(session.user?.id, user.id)
  assert.ok(session.user?.serverToken)
  console.log(`PASS production registration and NextAuth session; test prefix: ${prefix}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
