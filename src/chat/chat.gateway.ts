// chat.gateway.ts //이거는 원본에 없던 거임. 내가 추가한 듯.

import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GameService } from '../game/game.service';


@WebSocketGateway()
export class ChatGateway {
  constructor(private readonly gameService: GameService) {}

  @WebSocketServer() server: Server;

  @SubscribeMessage('eveningVoteResult') // 저녁: 사망자 투표 결과 표시
  handleEveningVoteResult(@MessageBody() votedPlayerName: string): void {
    // 저녁 투표 결과 표시 관련 로직 추가
    this.server.emit('message', `저녁에 ${votedPlayerName} 님이 투표로 사망하였습니다.`);
  }

  @SubscribeMessage('nightExecutionResult') // 밤: 사망자 처형 결과 표시
  handleNightExecutionResult(@MessageBody() votedPlayerName: string): void {
    // 밤 사망자 처형 결과 표시 관련 로직 추가
    this.server.emit('message', `밤에 ${votedPlayerName} 님이 처형되어 사망하였습니다.`);
  }

  @SubscribeMessage('mafiaVoteResult') // 새벽 1: 마피아 투표 결과 표시
  handleMafiaVoteResult(@MessageBody() data: string): void {
    // 마피아 투표 결과 표시 관련 로직 추가
    this.server.emit('message', `마피아 투표 결과: ${data}`);
  }

  @SubscribeMessage('gameResult') // 새벽 2: 게임 결과 표시
  handleGameResult(@MessageBody() result: string): void {
    // 게임 결과 표시 관련 로직 추가
    this.server.emit('message', `게임 결과: ${result}`);
  }
}