import { MultiplayerProvider } from "@/components/multiplayer/multiplayer-provider"
import { SocketProvider } from "@/components/multiplayer/socket-provider"

export default function RaceLayout({ children }: { children: React.ReactNode }) {
  return <SocketProvider><MultiplayerProvider>{children}</MultiplayerProvider></SocketProvider>
}
