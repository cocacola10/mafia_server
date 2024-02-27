// game.service.ts
import { Injectable } from '@nestjs/common';
import { Player, Role } from 'src/player.model';
import { Socket } from 'socket.io';

@Injectable()
export class GameService {
  [x: string]: any;
  private players: Player[] = [];
  private isDay: boolean = true;
  private votedPlayer: Player = null;
  private readonly totalPlayers: number = 8; // 고정된 플레이어 수
  private currentPhaseIndex = 0;
  private readonly gamePhases = ['morning', 'day', 'night', 'dawn'];
  private phaseDurations = {
    morning: 2 * 60, // 2분
    day: 2 * 60, // 2분
    night: 2 * 60, // 2분
    dawn: 2 * 60 // 2분
  }
  private phaseTimeout: NodeJS.Timeout;

  startGame(playerInfo: {name:string; client:Socket}[], socket: Socket): void {//수정
    if(playerInfo.length < this.totalPlayers){//수정
        console.log("플레이어 수가 부족하여 게임을 시작할 수 없습니다.");
        return;
    }


    // 게임 시작 시 초기화 및 플레이어 설정
    this.players = [];
    const mafiaCount = Math.floor(this.totalPlayers / 4);  //마피아는 총 플레이어 수의 25%
    const citizenCount = this.totalPlayers - mafiaCount;

    //마피아 플레이어 추가
    for(let i = 0; i < mafiaCount; i++){
        this.players.push(new Player(`mafia${i+1}`, Role.Mafia));
    }

    //시민 플레이어 추가
    for(let i = 0; i < citizenCount; i++)
    {
        this.players.push(new Player(`Citizen${i+1}`, Role.Citizen));
    }

    // 플레이어 역할 랜덤 배정 
    this.shufflePlayers();

      // 플레이어에게 역할 전달 및 이미지 수정
      this.players.forEach(player => {
        if (player.role === Role.Mafia) {
            player.client.emit('roleAssignment', { playerName: player.name, role: 'Mafia' });
            // 마피아 이미지 수정 //socket -> roleAssignment
        } else {
            // 시민 이미지 수정 (의사, 경찰 등)
            switch (player.role) {
                case Role.Citizen:
                    player.client.emit('roleAssignment', { playerName: player.name, role: 'Citizen' });
                    break;
                case Role.Doctor:
                    player.client.emit('roleAssignment', { playerName: player.name, role: 'Doctor' });
                    break;
                case Role.Police:
                    player.client.emit('roleAssignment', { playerName: player.name, role: 'Police' });
                    break;
                default:
                    player.client.emit('roleAssignment', { playerName: player.name, role: 'Citizen' });
            }
        }
    });
}
   private shufflePlayers(): void {
    // 플레이어 순서 섞기
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }
  }   
  
}