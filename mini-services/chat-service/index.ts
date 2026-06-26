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

/** Legacy in-memory chat message */
interface ChatMessage {
  id: string
  chatId: string
  userId: string
  content: string
  timestamp: Date
  flagged: boolean
  flaggedReason?: string
}

/** Legacy typing user */
interface TypingUser {
  userId: string
  chatId: string
  socketId: string
}

/** Reaction on a conversation message (mirrors frontend MessageReactionItem) */
interface ReactionItem {
  emoji: string
  userId: string
  user?: { profile?: { fullName: string } }
}
// Alias so the new event payload type name matches the frontend naming.
type MessageReactionItem = ReactionItem

/**
 * Full conversation message shape relayed by the chat-service.
 * The message has ALREADY been persisted by the Next.js API route — the
 * chat-service is a pure relay and never writes to the database.
 */
interface ChatMessageItem {
  id: string
  conversationId: string
  userId: string
  content: string
  replyToId?: string
  editedAt?: string
  deletedAt?: string
  attachmentUrl?: string
  attachmentType?: string
  attachmentName?: string
  flagged: boolean
  createdAt: string
  user?: {
    id: string
    email?: string
    profile?: { fullName?: string; profilePhoto?: string }
  }
  replyTo?: {
    id: string
    content: string
    userId: string
    user?: { profile?: { fullName: string } }
  } | null
  reactions: ReactionItem[]
}

/** Conversation typing user (Telegram-style) */
interface ConvTypingUser {
  userId: string
  conversationId: string
  socketId: string
  timeout: ReturnType<typeof setTimeout> | null
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** Legacy: messages keyed by chatId */
const messageStore: Map<string, ChatMessage[]> = new Map()

/** Legacy: currently-typing users. key = `${chatId}:${userId}` */
const typingUsers: Map<string, TypingUser> = new Map()

/** Conversation typing users. key = `${conversationId}:${userId}` */
const convTypingUsers: Map<string, ConvTypingUser> = new Map()

/** Track which rooms each socket has joined so we can clean up on disconnect. key = socket.id */
const socketRooms: Map<string, Set<string>> = new Map()

/** Online presence: set of userIds currently marked online */
const onlineUsers: Set<string> = new Set()

/** userId -> Set<socketId> for presence tracking (a user may have multiple sockets/tabs) */
const userSockets: Map<string, Set<string>> = new Map()

/** socketId -> userId reverse lookup for disconnect cleanup */
const socketUserId: Map<string, string> = new Map()

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

/** Track a joined room for cleanup on disconnect */
function trackRoom(socketId: string, roomName: string) {
  if (!socketRooms.has(socketId)) {
    socketRooms.set(socketId, new Set())
  }
  socketRooms.get(socketId)!.add(roomName)
}

/** Stop tracking a room for a socket */
function untrackRoom(socketId: string, roomName: string) {
  const rooms = socketRooms.get(socketId)
  if (rooms) {
    rooms.delete(roomName)
    if (rooms.size === 0) socketRooms.delete(socketId)
  }
}

/** Clear a conversation typing entry, cancelling its auto-clear timeout */
function clearConvTyping(key: string) {
  const entry = convTypingUsers.get(key)
  if (entry?.timeout) clearTimeout(entry.timeout)
  convTypingUsers.delete(key)
}

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------

io.on('connection', (socket: Socket) => {
  console.log(`[ChatService] Connected: ${socket.id}`)

  // =======================================================================
  // LEGACY EVENTS (kept for backward compatibility with the old chat UI)
  // =======================================================================

  // -----------------------------------------------------------------------
  // join-chat – join a specific chat room
  // -----------------------------------------------------------------------
  socket.on('join-chat', (data: { chatId: string }) => {
    const { chatId } = data
    if (!chatId) return

    const roomName = `chat:${chatId}`
    socket.join(roomName)
    trackRoom(socket.id, roomName)

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
  // typing – user started typing (legacy)
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
  // stop-typing – user stopped typing (legacy)
  // -----------------------------------------------------------------------
  socket.on('stop-typing', (data: { chatId: string; userId: string }) => {
    const { chatId, userId } = data
    if (!chatId || !userId) return

    removeTypingUser(chatId, userId)

    const roomName = `chat:${chatId}`
    socket.to(roomName).emit('stop-typing', { chatId, userId })
  })

  // -----------------------------------------------------------------------
  // flag-message – manually flag a message for admin review (legacy)
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
  // get-chat-history – request chat history for a specific chat (legacy)
  // -----------------------------------------------------------------------
  socket.on('get-chat-history', (data: { chatId: string }) => {
    const { chatId } = data
    if (!chatId) return

    const messages = getMessagesForChat(chatId)
    socket.emit('chat-history', { chatId, messages })
  })

  // =======================================================================
  // NEW TELEGRAM-STYLE CONVERSATION EVENTS
  // (Persistence is handled by the Next.js API routes — this service only
  //  relays real-time signals between sockets in conversation rooms.)
  // =======================================================================

  // -----------------------------------------------------------------------
  // join-conversation
  // -----------------------------------------------------------------------
  socket.on('join-conversation', (data: { conversationId: string }) => {
    const { conversationId } = data
    if (!conversationId) return

    const roomName = `conv:${conversationId}`
    socket.join(roomName)
    trackRoom(socket.id, roomName)

    console.log(
      `[ChatService] Socket ${socket.id} joined conversation room: ${conversationId}`
    )
  })

  // -----------------------------------------------------------------------
  // leave-conversation
  // -----------------------------------------------------------------------
  socket.on('leave-conversation', (data: { conversationId: string }) => {
    const { conversationId } = data
    if (!conversationId) return

    const roomName = `conv:${conversationId}`
    socket.leave(roomName)
    untrackRoom(socket.id, roomName)

    console.log(
      `[ChatService] Socket ${socket.id} left conversation room: ${conversationId}`
    )
  })

  // -----------------------------------------------------------------------
  // conversation-message – relay an already-persisted message to a room
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-message',
    (data: { conversationId: string; message: ChatMessageItem }) => {
      const { conversationId, message } = data
      if (!conversationId || !message) return

      const roomName = `conv:${conversationId}`

      // Suspicious-phrase detection (same engine as legacy send-message)
      const suspiciousPhrase = message.content
        ? detectSuspiciousContent(message.content)
        : null
      if (suspiciousPhrase) {
        message.flagged = true
        io.to('admin').emit('message-flagged', {
          message,
          reason: `Suspicious phrase detected: "${suspiciousPhrase}"`,
          conversationId,
        })
        console.log(
          `[ChatService] ⚠️  Conversation message flagged in ${conversationId} by user ${message.userId}: "${suspiciousPhrase}" detected`
        )
      }

      // Broadcast to everyone in the room INCLUDING sender (multi-tab confirmation)
      io.to(roomName).emit('conversation-message', { conversationId, message })

      // Clear typing status for this user in this conversation
      const typingKey = `${conversationId}:${message.userId}`
      clearConvTyping(typingKey)
      io.to(roomName).emit('conversation-stop-typing', {
        conversationId,
        userId: message.userId,
      })

      const preview = (message.content || '').substring(0, 60)
      console.log(
        `[ChatService] Conv message in ${conversationId} from ${message.userId}: ${preview}${(message.content || '').length > 60 ? '…' : ''}${suspiciousPhrase ? ' [FLAGGED]' : ''}`
      )
    }
  )

  // -----------------------------------------------------------------------
  // conversation-edit-message
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-edit-message',
    (data: {
      conversationId: string
      messageId: string
      content: string
      editedAt: string
    }) => {
      const { conversationId, messageId, content, editedAt } = data
      if (!conversationId || !messageId) return

      const roomName = `conv:${conversationId}`
      io.to(roomName).emit('conversation-edit-message', {
        conversationId,
        messageId,
        content,
        editedAt,
      })

      console.log(
        `[ChatService] Conv message edited in ${conversationId}: ${messageId}`
      )
    }
  )

  // -----------------------------------------------------------------------
  // conversation-delete-message
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-delete-message',
    (data: { conversationId: string; messageId: string }) => {
      const { conversationId, messageId } = data
      if (!conversationId || !messageId) return

      const roomName = `conv:${conversationId}`
      io.to(roomName).emit('conversation-delete-message', {
        conversationId,
        messageId,
      })

      console.log(
        `[ChatService] Conv message deleted in ${conversationId}: ${messageId}`
      )
    }
  )

  // -----------------------------------------------------------------------
  // conversation-reaction – relay the full updated reactions list
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-reaction',
    (data: {
      conversationId: string
      messageId: string
      emoji: string
      userId: string
      reactions: MessageReactionItem[]
    }) => {
      const { conversationId, messageId, emoji, userId, reactions } = data
      if (!conversationId || !messageId) return

      const roomName = `conv:${conversationId}`
      io.to(roomName).emit('conversation-reaction', {
        conversationId,
        messageId,
        emoji,
        userId,
        reactions,
      })

      console.log(
        `[ChatService] Conv reaction in ${conversationId} on ${messageId} by ${userId}: ${emoji}`
      )
    }
  )

  // -----------------------------------------------------------------------
  // conversation-typing – broadcast typing indicator (exclude sender)
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-typing',
    (data: {
      conversationId: string
      userId: string
      user?: { id: string; profile?: { fullName: string } }
    }) => {
      const { conversationId, userId, user } = data
      if (!conversationId || !userId) return

      const key = `${conversationId}:${userId}`
      const roomName = `conv:${conversationId}`

      // Reset any existing auto-clear timeout for this user
      const existing = convTypingUsers.get(key)
      if (existing?.timeout) clearTimeout(existing.timeout)

      convTypingUsers.set(key, {
        userId,
        conversationId,
        socketId: socket.id,
        timeout: setTimeout(() => {
          convTypingUsers.delete(key)
          io.to(roomName).emit('conversation-stop-typing', {
            conversationId,
            userId,
          })
        }, 4000),
      })

      // Broadcast to others in the room (exclude sender)
      socket.to(roomName).emit('conversation-typing', {
        conversationId,
        userId,
        user,
      })
    }
  )

  // -----------------------------------------------------------------------
  // conversation-stop-typing – broadcast stop-typing (exclude sender)
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-stop-typing',
    (data: { conversationId: string; userId: string }) => {
      const { conversationId, userId } = data
      if (!conversationId || !userId) return

      const key = `${conversationId}:${userId}`
      clearConvTyping(key)

      const roomName = `conv:${conversationId}`
      socket.to(roomName).emit('conversation-stop-typing', {
        conversationId,
        userId,
      })
    }
  )

  // -----------------------------------------------------------------------
  // conversation-read – broadcast read receipt (exclude sender)
  // -----------------------------------------------------------------------
  socket.on(
    'conversation-read',
    (data: { conversationId: string; userId: string }) => {
      const { conversationId, userId } = data
      if (!conversationId || !userId) return

      const roomName = `conv:${conversationId}`
      socket.to(roomName).emit('conversation-read', {
        conversationId,
        userId,
      })
    }
  )

  // =======================================================================
  // PRESENCE
  // =======================================================================

  // -----------------------------------------------------------------------
  // user-identity – register socket <-> userId mapping for presence
  // -----------------------------------------------------------------------
  socket.on('user-identity', (data: { userId: string }) => {
    const { userId } = data
    if (!userId) return

    socketUserId.set(socket.id, userId)
    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    userSockets.get(userId)!.add(socket.id)

    console.log(
      `[ChatService] Socket ${socket.id} identified as user ${userId} (${userSockets.get(userId)!.size} socket(s) active)`
    )
  })

  // -----------------------------------------------------------------------
  // user-presence – announce online/offline to ALL sockets
  // -----------------------------------------------------------------------
  socket.on(
    'user-presence',
    (data: { userId: string; status: 'online' | 'offline' }) => {
      const { userId, status } = data
      if (!userId) return

      if (status === 'online') {
        onlineUsers.add(userId)
        io.emit('user-presence', { userId, status: 'online' })
      } else {
        onlineUsers.delete(userId)
        io.emit('user-presence', { userId, status: 'offline' })
      }
    }
  )

  // =======================================================================
  // disconnect – clean up presence, typing indicators, room tracker
  // =======================================================================
  socket.on('disconnect', () => {
    // 1) Presence cleanup — if this was the user's last socket, go offline
    const userId = socketUserId.get(socket.id)
    if (userId) {
      const sockets = userSockets.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          userSockets.delete(userId)
          onlineUsers.delete(userId)
          io.emit('user-presence', { userId, status: 'offline' })
          console.log(
            `[ChatService] User ${userId} went offline (no more active sockets)`
          )
        }
      }
      socketUserId.delete(socket.id)
    }

    // 2) Clear conversation typing indicators for this socket across all rooms
    for (const [key, entry] of convTypingUsers.entries()) {
      if (entry.socketId === socket.id) {
        const roomName = `conv:${entry.conversationId}`
        if (entry.timeout) clearTimeout(entry.timeout)
        io.to(roomName).emit('conversation-stop-typing', {
          conversationId: entry.conversationId,
          userId: entry.userId,
        })
        convTypingUsers.delete(key)
      }
    }

    // 3) Clear legacy typing indicators for this socket
    for (const [key, typingUser] of typingUsers.entries()) {
      if (typingUser.socketId === socket.id) {
        const roomName = `chat:${typingUser.chatId}`
        io.to(roomName).emit('stop-typing', {
          chatId: typingUser.chatId,
          userId: typingUser.userId,
        })
        typingUsers.delete(key)
      }
    }

    // 4) Clean up room tracker (Socket.io auto-leaves rooms, but we tidy our map)
    socketRooms.delete(socket.id)

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
  console.log(
    `[ChatService] Events (legacy): join-chat, send-message, typing, stop-typing, flag-message, join-admin, get-chat-history`
  )
  console.log(
    `[ChatService] Events (conversations): join-conversation, leave-conversation, conversation-message, conversation-edit-message, conversation-delete-message, conversation-reaction, conversation-typing, conversation-stop-typing, conversation-read`
  )
  console.log(
    `[ChatService] Events (presence): user-identity, user-presence`
  )
  console.log(
    `[ChatService] Safety monitoring: ${SUSPICIOUS_PHRASES.length} suspicious phrases tracked`
  )
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
