import 'dotenv/config'
import { createServer } from 'http'
import { createApp } from './app'
import { createSocketServer } from './socket'
import { env } from './config/env'

async function main() {
  const app = createApp()
  const httpServer = createServer(app)
  const io = createSocketServer(httpServer)

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`)
    console.log(`🌍 Environment: ${env.NODE_ENV}`)
  })

  const shutdown = async () => {
    console.log('\n🔴 Shutting down server...')
    httpServer.close(() => {
      console.log('✅ HTTP server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})
