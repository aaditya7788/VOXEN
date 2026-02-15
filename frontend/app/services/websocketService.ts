import { io, Socket } from "socket.io-client";

// WebSocket Service for real-time features using Socket.io
export class WebSocketService {
  private socket: Socket | null = null;
  private url: string;
  private token: string | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(url?: string) {
    // Default to origin if not provided, socket.io handles path-to-ws conversion
    this.url = url || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:4000";
  }

  /**
   * Connect to WebSocket server
   */
  public connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.token = token || (typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null);

      try {
        // Initialize socket.io client
        this.socket = io(this.url, {
          auth: {
            token: this.token
          },
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          transports: ['websocket', 'polling'] // Allow fallback for compatibility
        });

        this.socket.on("connect", () => {
          console.log("WebSocket (Socket.io) connected");
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error);
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("WebSocket disconnected:", reason);
        });

        // Universal listener for all events to support the generic 'on' method
        this.socket.onAny((event, data) => {
          this.emit(event, data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Send message to server
   */
  public send(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Subscribe to event
   */
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit event to internal listeners
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in callback for event ${event}:`, err);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
let wsInstance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsInstance) {
    wsInstance = new WebSocketService();
  }
  return wsInstance;
}
