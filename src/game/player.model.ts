// src/game/player.model.ts

import { Socket } from 'socket.io';

export class Player {
  name: string;
  role: string; // role을 string으로 수정
  client: Socket | null = null; // client를 초기화하고 나중에 매핑할 수 있도록 수정
  clientId: string;

  constructor(name: string, role: string, clientId?: string) {
    this.name = name;
    this.role = role;
    this.clientId = clientId;
  }

  // client를 설정하는 메서드 추가
  setClient(client: Socket): void {
    this.client = client;
  }
}
