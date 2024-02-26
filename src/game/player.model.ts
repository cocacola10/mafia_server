// src/game/player.model.ts


import { Socket } from 'socket.io';

export class Player {
  name: string;
  client: Socket; // Add client property
    role: any;
    clientId: any;

  constructor(name: string, client: Socket) {
    this.name = name;
    this.client = client; // Initialize client property
  }
}

