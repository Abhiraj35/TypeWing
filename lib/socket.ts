import { io, type Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types"

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedSocket | null = null

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}
