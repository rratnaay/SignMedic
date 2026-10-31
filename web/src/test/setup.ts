import '@testing-library/jest-dom';

// Polyfill BroadcastChannel for Vitest jsdom environment
if (typeof globalThis.BroadcastChannel === 'undefined') {
  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

    constructor(name: string) {
      this.name = name;
      if (!MockBroadcastChannel.channels.has(name)) {
        MockBroadcastChannel.channels.set(name, new Set());
      }
      MockBroadcastChannel.channels.get(name)!.add(this);
    }

    postMessage(data: unknown) {
      const peers = MockBroadcastChannel.channels.get(this.name);
      if (peers) {
        peers.forEach((peer) => {
          if (peer !== this && peer.onmessage) {
            peer.onmessage(new MessageEvent('message', { data }));
          }
        });
      }
    }

    close() {
      const peers = MockBroadcastChannel.channels.get(this.name);
      if (peers) {
        peers.delete(this);
      }
    }
  }

  // @ts-expect-error polyfill mock
  globalThis.BroadcastChannel = MockBroadcastChannel;
}
