import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { timeout } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { ChatGateway } from 'src/chat/chat.gateway';
import { GameService } from 'src/game/game.service';
import { Player } from 'src/game/player.model';
import { UserController } from 'src/user/user.controller';
import { UserService } from 'src/user/user.service';

@WebSocketGateway({ transports: ['websocket'] })
export class EventsGateway
implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
constructor(private readonly gameService:GameService){}
// 방 번호에 따른 클라이언트를 관리하는 오브젝트
private static clients: { [roomId: number]: Socket[] } = {};
private static playerRole: Player[][] = [];//배열로 초기화

//private static players:  { [roomId: number]: Player[] } = {}; // 새로운 변수 추가

// lobby number
readonly lobby: number = 0;

// 방 개수 관리용 변수
private static roomCount = 0;

@WebSocketServer()
server: Server;

// 재정의한 메서드들
afterInit(server: Server) {
  this.server = server;
  console.log('Server Start');
}

handleDisconnect(client: Socket) {
  console.log('disconnect : ',client.id);
  // 모든 roomid에 대해 클라이언트를 찾아서 삭제
  for (const roomId in EventsGateway.clients) {
    const clients = EventsGateway.clients[this.lobby]; 
    const index = EventsGateway.clients[roomId].indexOf(client);
    if (index !== -1) {
      // 해당 roomid의 배열에서 클라이언트 삭제
      EventsGateway.clients[roomId].splice(index, 1);
      // 만약 해당 roomid의 배열이 빈 배열이라면 해당 roomid를 삭제
      if (EventsGateway.clients[roomId].length === 0) {
        delete EventsGateway.clients[roomId];
        // 클라이언트 리로드를 브로드캐스트
        
        // roomId가 0인 socket들에게 broadcast
        for (var i = 0; i<clients.length; i++){
          clients[i].emit('reloadRoom', roomId, "delete");
        }
      } 
    }
  }
}

// default lobby = 0
handleConnection(client: Socket) {
  console.log('connect : ',client.id);
  if (!EventsGateway.clients[this.lobby]) {
    // 만약 해당 roomid의 배열이 없다면 새로 생성
    EventsGateway.clients[this.lobby] = [];
  }
  EventsGateway.clients[this.lobby].push(client);
}

// 클라이언트에서 'message' 이벤트를 수신할 때 실행되는 핸들러
@SubscribeMessage('message')
handleMessage(client: Socket, @MessageBody() data: string): void {
  const clients = EventsGateway.clients[data[0]];

  if(data.indexOf('/kill') !== -1){
    const clientId = client.id;

  }

  //클라이언트가 존재하는지 체크
  if(clients){
    for ( var i = 0; i<clients.length; i++ ){
      clients[i].emit('message', data[0], data[1]);
    }
  } else {
    console.log('Clients not found for room:', data[0]);
  }
  
}

// 클라이언트에서 'createRoom' 이벤트를 수신할 때 실행되는 핸들러
@SubscribeMessage('createRoom')
handleCreateRoom(client: Socket) {
  
  // 새로운 방을 생성하고 들어가는 로직
  EventsGateway.roomCount++;
  const num = EventsGateway.roomCount;
  EventsGateway.clients[num] = [];
  EventsGateway.clients[num].push(client);
  
  // 기존 로비에서 나가는 로직
  this.funcQuitLobby(client);

  // 방 변경이 완료 됐음을 알리는 로직
  client.emit('changeRoom', num);
  
  // 로비 상태를 업데이트하는 로직
  const clients = EventsGateway.clients[this.lobby];
  
  for ( var i = 0; i<clients.length; i++){
    clients[i].emit('reloadRoom', num, 'create', client.id, EventsGateway.clients[num].length);
  }
}

// 클라이언트가 방에서 나갈 때
@SubscribeMessage('quitRoom')
handleQuitRoom(client: Socket, room: number) {
  const roomClients = EventsGateway.clients[room];
  const clients = EventsGateway.clients[this.lobby];
  if (roomClients){
    const index = roomClients.indexOf(client);

    if (index !== -1) {
      roomClients.splice(index, 1);

      // 배열에서 빈 공간을 없애고 재정렬
      EventsGateway.clients[room] = roomClients.filter(Boolean);
      EventsGateway.clients[this.lobby].push(client);

      // 만약 해당 방에 더 이상 클라이언트가 없으면 해당 방 번호 삭제
      if (roomClients.length == 0) {
        // 클라이언트 리로드를 로비 클라이언트한테 멀티캐스트
        for ( var i = 0; i<clients.length; i++){
          clients[i].emit('reloadRoom', room, 'delete');
        }
        delete EventsGateway.clients[room];
      }
      else{
        // admin >> 최신화한 것으로 해야함.
        for ( var i = 0; i<clients.length; i++){
          clients[i].emit('reloadRoom', room, 'quit', "", roomClients.length);
        }
        for ( var i = 0; i<roomClients.length; i++){
          roomClients[i].emit('reloadUser', 'quit', client.id, room, roomClients.length, roomClients[0].id);
        }
      }
    }
  }
}

// client room join
@SubscribeMessage('joinRoom')
handleJoinRoom(client: Socket, room: number){
  const roomClients = EventsGateway.clients[room];
  const clients = EventsGateway.clients[this.lobby];
  if (roomClients && roomClients.length>0 && roomClients.length<8){
    // client room join
    this.funcQuitLobby(client);
    roomClients.push(client);
    client.emit('SuccessJoinRoom', room);
    
    // lobby clients reload
    for ( var i = 0; i<clients.length; i++){
      clients[i].emit('reloadRoom', room, 'join', '', roomClients.length);
    }

    for ( var i = 0; i<roomClients.length; i++){
      roomClients[i].emit('reloadUser', 'join', client.id, room, roomClients.length);
    }
  }
  else{
    // Fail
  }
}

// client lobby join
@SubscribeMessage('joinLobby')
handleJoinLobby(client: Socket){
  client.emit('reloadLobby', this.getRoomInfo());
}

// client room join
@SubscribeMessage('joinUser')
handleJoinUser(client: Socket, roomId: number){
  client.emit('setUsers', this.getUserInfo(roomId), EventsGateway.clients[roomId].length);
}

// start game
@SubscribeMessage('startGame')
  handleStartGame(client: Socket, roomId: number){
    const roomClients = EventsGateway.clients[roomId];
    const clients = EventsGateway.clients[this.lobby];

    for ( var i = 0; i<roomClients.length; i++){
      roomClients[i].emit('startGame', roomId);
    }

    for ( var i = 0; i<clients.length; i++){
      clients[i].emit('reloadRoom', roomId, 'delete')
    }
    
    //현재 플레이어가 로그인된 유저와 매핑되지 않아
    //임시로 본인은 소켓id, 나머지는 랜덤문자열로 넣어둠
    const players = roomClients.map((el : Socket)=>{
      return {name : 'testname', clientId: el.id}; 
    });

    const len = players.length;
    for (let d = 5; d > len; d--){
      players.push({
        name: 'test' + d,
        clientId: Math.random().toString(36).substring(2,12),
      });
    }
    
    setTimeout(() => {
      const t = this.gameService.startGame(players, this.server);
      console.log(t);
      
      // players 변수에 할당
      EventsGateway.playerRole[55] = t;
      
      console.log(EventsGateway.playerRole[55]);
    }, 1000);
  

  this.gameService.startGame(players, this.server);
//추가 끝
}

// join game
@SubscribeMessage('joinGame')
handleJoinGame(client: Socket, roomId: number){
  const clients = EventsGateway.clients[roomId];
  const users = [];

  for (var i=0; i<clients.length; i++){
    users.push(clients[i].id);
  }

  client.emit('joinGame', users);
}

// quit game
@SubscribeMessage('quitGame')
handleQuitGame(client: Socket, roomId: number){
  const clients = EventsGateway.clients[roomId];
  const index = clients.indexOf(client);

  if (index !== -1){
    clients.splice(index, 1);
    for ( var i = 0; i<clients.length; i++){
      clients[i].emit('reloadGame', client.id);
    }
  }
}

// 로비에서 나가는 함수
private funcQuitLobby(client: Socket){
  const index = EventsGateway.clients[this.lobby].indexOf(client);
    if (index !== -1) {
      EventsGateway.clients[this.lobby].splice(index, 1);
  }
}

// 방 정보를 반환하는 함수
private getRoomInfo(): any {
  // 방 정보 객체를 생성하여 반환
  const roomInfo = [];
  
  for (var i = 1; i<=EventsGateway.roomCount; i++){
    const room = EventsGateway.clients[i];

    if(room && room.length>0){
      // 방 주인 connect id 추후 닉네임으로 변경 예정
      const owner = room[0]; 
      const members = room.length; 

      // 방 정보를 객체로 생성하여 배열에 추가
      const roomData = {
        roomId: i,
        owner: owner.id, 
        members: members 
      };
      roomInfo.push(roomData);
    }
  }
  return roomInfo;
}

private getUserInfo(roomId: number): any {
  const userInfo = [];
  const room = EventsGateway.clients[roomId];
  console.log(roomId);
  for(var i = 0; i<room.length; i++){
    userInfo.push(room[i].id);
  }

  return userInfo;
}
}