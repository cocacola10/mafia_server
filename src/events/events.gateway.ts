import {
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ transports: ['websocket'] })
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  // 방 번호에 따른 클라이언트를 관리하는 오브젝트
  private static clients: { [roomId: number]: Socket[] } = {};

  // lobby number
  readonly lobby: number = 0;

  // 방 개수 관리용 변수
  private static roomCount = 0;

  @WebSocketServer()
  server: Server;

  // 재정의한 메서드들
  afterInit(server: Server) {
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
  handleMessage(@MessageBody() data: string) {
    const clients = EventsGateway.clients[data[0]];

    for ( var i = 0; i<clients.length; i++ ){
      clients[i].emit('message', data[0], data[1]);
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