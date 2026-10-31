/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { WebSocketServer, WebSocket } from 'ws';

function triageSyncRelayPlugin(): Plugin {
  return {
    name: 'signmedic-triage-sync-relay',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map<string, Set<WebSocket>>();

      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/ws-sync')) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        }
      });

      wss.on('connection', (ws) => {
        let currentRoom: string | null = null;
        let currentRole: string | null = null;

        ws.on('message', (rawData) => {
          try {
            const msg = JSON.parse(rawData.toString());
            if (msg.type === 'JOIN_ROOM') {
              currentRoom = String(msg.roomId);
              currentRole = msg.role || 'client';
              if (!rooms.has(currentRoom)) {
                rooms.set(currentRoom, new Set());
              }
              const roomSet = rooms.get(currentRoom)!;
              roomSet.add(ws);

              // If another peer is already in room, notify each other
              if (roomSet.size > 1) {
                roomSet.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'PEER_CONNECTED', role: currentRole }));
                  }
                });
              }
            } else if (msg.type === 'SYNC_STATE' && currentRoom) {
              const roomSet = rooms.get(currentRoom);
              if (roomSet) {
                roomSet.forEach((client) => {
                  if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'SYNC_STATE', payload: msg.payload }));
                  }
                });
              }
            }
          } catch {
            // Ignore malformed message
          }
        });

        ws.on('close', () => {
          if (currentRoom && rooms.has(currentRoom)) {
            const roomSet = rooms.get(currentRoom)!;
            roomSet.delete(ws);
            if (roomSet.size === 0) {
              rooms.delete(currentRoom); // Clean up in-memory room immediately
            } else {
              roomSet.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: 'PEER_DISCONNECTED' }));
                }
              });
            }
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), triageSyncRelayPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
