import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

class SocketService {
  public socket: Socket | null = null;
  private currentSessionId: string | null = null;

  connect(token: string, sessionId: string) {
    // If already connected with the same sessionId, do nothing
    if (this.socket?.connected && this.currentSessionId === sessionId) return;

    // Disconnect old socket if exists (sessionId changed or disconnected)
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentSessionId = sessionId;
    this.socket = io(URL, {
      withCredentials: true,   // Browser sends httpOnly cookies automatically
      autoConnect: true,
      auth: { token },         // Fallback for non-httpOnly environments
      query: { sessionId }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentSessionId = null;
    }
  }
}

export const socketService = new SocketService();

export function useSocket(token?: string, sessionId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (token && sessionId) {
      socketService.connect(token, sessionId);
      socketRef.current = socketService.socket;
    }
    return () => {
      // Don't auto disconnect on re-render to keep connections stable,
      // but component level cleans might call socketService.disconnect()
    };
  }, [token, sessionId]);

  return socketRef.current;
}
