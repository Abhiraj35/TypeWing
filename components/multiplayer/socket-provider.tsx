"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { getSocket, type TypedSocket } from "@/lib/socket"

interface SocketContextValue {
  socket: TypedSocket
  connected: boolean
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef(getSocket())
  const [connected, setConnected] = useState(socketRef.current.connected)

  useEffect(() => {
    const socket = socketRef.current
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.connect()
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.disconnect()
      setConnected(false)
    }
  }, [])

  return <SocketContext.Provider value={{ socket: socketRef.current, connected }}>{children}</SocketContext.Provider>
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext)
  if (!context) throw new Error("useSocket must be used within SocketProvider")
  return context
}
