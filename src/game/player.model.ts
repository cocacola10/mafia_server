import { Socket } from 'socket.io';

export class Player {
  name: string;
  role: string;
  client: Socket | null = null;
  clientId: string; // clientId 추가

  constructor(name: string, role: string, clientId?: string) {
    this.name = name;
    this.role = role;
    this.clientId = clientId || ''; // clientId가 없을 경우 빈 문자열로 초기화
  }

  // client를 설정하는 메서드 추가
  setClient(client: Socket): void {
    this.client = client;
  }

  // 플레이어 객체의 이름을 동물 이름으로 변경하는 메서드
  static assignAnimalNames(players: Player[]): void {
    const animalNames = ['Dog', 'Cat', 'Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Monkey', 'Panda', 'Kangaroo'];
    for (let i = 0; i < players.length; i++) {
      players[i].clientId = animalNames[i % animalNames.length]; // clientId를 동물 이름으로 변경
    }
  }
}
