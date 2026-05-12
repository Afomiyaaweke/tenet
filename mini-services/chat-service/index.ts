import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  chatId: string
  userId: string
  content: string
  timestamp: Date
  flagged: boolean
  flaggedReason?: string
}

interface TypingUser {
  userId: string
  chatId: string
  socketId: string
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** Messages keyed by chatId */
const messageStore: Map<string, ChatMessage[]> = new Map()

/** Currently-typing users */
const typingUsers: Map<string, TypingUser> = new Map() // key = `${chatId}:${userId}`

/** Track which rooms each socket has joined so we can clean up on disconnect */
const socketRooms: Map<string, Set<string>> = new Map() // key = socket.id

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateId = (): string =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36)

/** Suspicious phrases that violate platform policy */
const SUSPICIOUS_PHRASES = [
  'outside platform',
  'direct payment',
  'cash only',
  'no receipt',
  'off platform',
  'bypass',
  'under the table',
  'personal transfer',
  'private deal',
]

function detectSuspiciousContent(content: string): string | null {
  const lower = content.toLowerCase()
  for (const phrase of SUSPICIOUS_PHRASES) {
    if (lower.includes(phrase)) {
      return phrase
    }
  }
  return null
}

function getMessagesForChat(chatId: string): ChatMessage[] {
  if (!messageStore.has(chatId)) {
    messageStore.set(chatId, [])
  }
  return messageStore.get(chatId)!
}

function removeTypingUser(chatId: string, userId: string) {
  const key = `${chatId}:${userId}`
  typingUsers.delete(key)
}

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------

io.on('connection', (socket: Socket) => {
  console.log(`[ChatService] Connected: ${socket.id}`)

  // -----------------------------------------------------------------------
  // join-chat – join a specific chat room
  // -----------------------------------------------------------------------
  socket.on('join-chat', (data: { chatId: string }) => {
    const { chatId } = data
    if (!chatId) return

    const roomName = `chat:${chatId}`
    socket.join(roomName)

    // Track room membership for cleanup
    if (!socketRooms.has(socket.id)) {
      socketRooms.set(socket.id, new Set())
    }
    socketRooms.get(socket.id)!.add(roomName)

    // Send recent messages to the joining user
    const messages = getMessagesForChat(chatId)
    socket.emit('chat-history', { chatId, messages })

    console.log(
      `[ChatService] Socket ${socket.id} joined chat room: ${chatId} (${messages.length} history messages sent)`
    )
  })

  // -----------------------------------------------------------------------
  // send-message – send a message to a chat room
  // -----------------------------------------------------------------------
  socket.on(
    'send-message',
    (data: { chatId: string; userId: string; content: string }) => {
      const { chatId, userId, content } = data
      if (!chatId || !userId || !content) return

      // Safety check – keyword detection
      const suspiciousPhrase = detectSuspiciousContent(content)
      const flagged = suspiciousPhrase !== null

      const message: ChatMessage = {
        id: generateId(),
        chatId,
        userId,
        content,
        timestamp: new Date(),
        flagged,
        flaggedReason: suspiciousPhrase ?? undefined,
      }

      // Store in memory
      getMessagesForChat(chatId).push(message)

      const roomName = `chat:${chatId}`

      // Broadcast the message to everyone in the room (including sender for confirmation)
      io.to(roomName).emit('message-received', message)

      // If flagged, notify admin room
      if (flagged) {
        io.to('admin').emit('message-flagged', {
          message,
          reason: `Suspicious phrase detected: "${suspiciousPhrase}"`,
          chatId,
        })
        console.log(
          `[ChatService] ⚠️  Message flagged in chat ${chatId} by user ${userId}: "${suspiciousPhrase}" detected`
        )
      }

      // Auto-clear typing status for this user in this chat
      removeTypingUser(chatId, userId)
      io.to(roomName).emit('stop-typing', { chatId, userId })

      console.log(
        `[ChatService] Message in ${chatId} from ${userId}: ${content.substring(0, 60)}${content.length > 60 ? '…' : ''}${flagged ? ' [FLAGGED]' : ''}`
      )
    }
  )

  // -----------------------------------------------------------------------
  // typing – user started typing
  // -----------------------------------------------------------------------
  socket.on('typing', (data: { chatId: string; userId: string }) => {
    const { chatId, userId } = data
    if (!chatId || !userId) return

    const key = `${chatId}:${userId}`
    typingUsers.set(key, { chatId, userId, socketId: socket.id })

    const roomName = `chat:${chatId}`
    socket.to(roomName).emit('typing', { chatId, userId })
  })

  // -----------------------------------------------------------------------
  // stop-typing – user stopped typing
  // -----------------------------------------------------------------------
  socket.on('stop-typing', (data: { chatId: string; userId: string }) => {
    const { chatId, userId } = data
    if (!chatId || !userId) return

    removeTypingUser(chatId, userId)

    const roomName = `chat:${chatId}`
    socket.to(roomName).emit('stop-typing', { chatId, userId })
  })

  // -----------------------------------------------------------------------
  // flag-message – manually flag a message for admin review
  // -----------------------------------------------------------------------
  socket.on(
    'flag-message',
    (data: { chatId: string; messageId: string }) => {
      const { chatId, messageId } = data
      if (!chatId || !messageId) return

      // Update in-memory store
      const messages = getMessagesForChat(chatId)
      const message = messages.find((m) => m.id === messageId)
      if (message) {
        message.flagged = true
        message.flaggedReason = 'Manually flagged by user'
      }

      // Notify admin room
      io.to('admin').emit('message-flagged', {
        message: message || { id: messageId, chatId },
        reason: 'Manually flagged by user',
        chatId,
      })

      console.log(
        `[ChatService] 🚩 Message ${messageId} in chat ${chatId} manually flagged for admin review`
      )
    }
  )

  // -----------------------------------------------------------------------
  // join-admin – join the admin monitoring room
  // -----------------------------------------------------------------------
  socket.on('join-admin', () => {
    socket.join('admin')
    console.log(`[ChatService] Socket ${socket.id} joined admin room`)
  })

  // -----------------------------------------------------------------------
  // get-chat-history – request chat history for a specific chat
  // -----------------------------------------------------------------------
  socket.on('get-chat-history', (data: { chatId: string }) => {
    const { chatId } = data
    if (!chatId) return

    const messages = getMessagesForChat(chatId)
    socket.emit('chat-history', { chatId, messages })
  })

  // -----------------------------------------------------------------------
  // disconnect – clean up
  // -----------------------------------------------------------------------
  socket.on('disconnect', () => {
    const rooms = socketRooms.get(socket.id)

    if (rooms) {
      // Remove typing indicators for this socket across all rooms
      for (const [_key, typingUser] of typingUsers.entries()) {
        if (typingUser.socketId === socket.id) {
          const roomName = `chat:${typingUser.chatId}`
          io.to(roomName).emit('stop-typing', {
            chatId: typingUser.chatId,
            userId: typingUser.userId,
          })
          typingUsers.delete(_key)
        }
      }

      // Leave all rooms (Socket.io handles this automatically, but we clean our tracker)
      socketRooms.delete(socket.id)
    }

    console.log(`[ChatService] Disconnected: ${socket.id}`)
  })

  socket.on('error', (error: Error) => {
    console.error(`[ChatService] Socket error (${socket.id}):`, error)
  })
})

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`[ChatService] ✅ WebSocket chat service running on port ${PORT}`)
  console.log(`[ChatService] Events: join-chat, send-message, typing, stop-typing, flag-message, join-admin, get-chat-history`)
  console.log(`[ChatService] Safety monitoring: ${SUSPICIOUS_PHRASES.length} suspicious phrases tracked`)
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = () => {
  console.log('[ChatService] Shutting down...')
  io.disconnectSockets()
  httpServer.close(() => {
    console.log('[ChatService] Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
