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
import { GameService } from 'src/game/game.service';
import { Player } from 'src/game/player.model';

@WebSocketGateway({ transports: ['websocket'] })
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  constructor(private readonly gameService: GameService) {}
  private static clients: { [roomId: number]: Socket[] } = {};
  private static playerRole: Player[][] = [];
  readonly lobby: number = 0;
  private static roomCount = 0;

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.server = server;
    console.log('Server Start');
  }

  handleDisconnect(client: Socket) {
    console.log('disconnect : ', client.id);
    for (const roomId in EventsGateway.clients) {
      const clients = EventsGateway.clients[this.lobby];
      const index = EventsGateway.clients[roomId].indexOf(client);
      if (index !== -1) {
        EventsGateway.clients[roomId].splice(index, 1);
        if (EventsGateway.clients[roomId].length === 0) {
          delete EventsGateway.clients[roomId];
          for (var i = 0; i < clients.length; i++) {
            clients[i].emit('reloadRoom', roomId, 'delete');
          }
        }
      }
    }
  }

  handleConnection(client: Socket) {
    console.log('connect : ', client.id);
    if (!EventsGateway.clients[this.lobby]) {
      EventsGateway.clients[this.lobby] = [];
    }
    EventsGateway.clients[this.lobby].push(client);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, @MessageBody() data: string): void {
    const clients = EventsGateway.clients[data[0]];
    if (data.indexOf('/kill') !== -1) {
      const clientId = client.id;
    }
    if (clients) {
      for (var i = 0; i < clients.length; i++) {
        clients[i].emit('message', data[0], data[1]);
      }
    } else {
      console.log('Clients not found for room:', data[0]);
    }
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(client: Socket) {
    EventsGateway.roomCount++;
    const num = EventsGateway.roomCount;
    EventsGateway.clients[num] = [];
    EventsGateway.clients[num].push(client);
    this.funcQuitLobby(client);
    client.emit('changeRoom', num);
    const clients = EventsGateway.clients[this.lobby];
    for (var i = 0; i < clients.length; i++) {
      clients[i].emit('reloadRoom', num, 'create', client.id, EventsGateway.clients[num].length);
    }
  }

  @SubscribeMessage('quitRoom')
  handleQuitRoom(client: Socket, room: number) {
    const roomClients = EventsGateway.clients[room];
    const clients = EventsGateway.clients[this.lobby];
    if (roomClients) {
      const index = roomClients.indexOf(client);
      if (index !== -1) {
        roomClients.splice(index, 1);
        EventsGateway.clients[room] = roomClients.filter(Boolean);
        EventsGateway.clients[this.lobby].push(client);
        if (roomClients.length == 0) {
          for (var i = 0; i < clients.length; i++) {
            clients[i].emit('reloadRoom', room, 'delete');
          }
          delete EventsGateway.clients[room];
        } else {
          for (var i = 0; i < clients.length; i++) {
            clients[i].emit('reloadRoom', room, 'quit', '', roomClients.length);
          }
          for (var i = 0; i < roomClients.length; i++) {
            roomClients[i].emit('reloadUser', 'quit', client.id, room, roomClients.length, roomClients[0].id);
          }
        }
      }
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: number) {
    const roomClients = EventsGateway.clients[room];
    const clients = EventsGateway.clients[this.lobby];
    if (roomClients && roomClients.length > 0 && roomClients.length < 8) {
      this.funcQuitLobby(client);
      roomClients.push(client);
      client.emit('SuccessJoinRoom', room);
      for (var i = 0; i < clients.length; i++) {
        clients[i].emit('reloadRoom', room, 'join', '', roomClients.length);
      }
      for (var i = 0; i < roomClients.length; i++) {
        roomClients[i].emit('reloadUser', 'join', client.id, room, roomClients.length);
      }
    }
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(client: Socket) {
    client.emit('reloadLobby', this.getRoomInfo());
  }

  @SubscribeMessage('joinUser')
  handleJoinUser(client: Socket, roomId: number) {
    client.emit('setUsers', this.getUserInfo(roomId), EventsGateway.clients[roomId].length);
  }

  @SubscribeMessage('startGame')
  handleStartGame(client: Socket, roomId: number) {
    const roomClients = EventsGateway.clients[roomId];
    const clients = EventsGateway.clients[this.lobby];
    for (var i = 0; i < roomClients.length; i++) {
      roomClients[i].emit('startGame', roomId);
    }
    for (var i = 0; i < clients.length; i++) {
      clients[i].emit('reloadRoom', roomId, 'delete');
    }
    const players = roomClients.map((el: Socket) => {
      return { name: 'testname', clientId: el.id };
    });
    const len = players.length;
    for (let d = 5; d > len; d--) {
      players.push({
        name: 'test' + d,
        clientId: Math.random().toString(36).substring(2, 12),
      });
    }
    setTimeout(() => {
      const t = this.gameService.startGame(players, this.server);
      EventsGateway.playerRole[55] = t;
    }, 1000);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, roomId: number) {
    const clients = EventsGateway.clients[roomId];
    const users = [];
    for (var i = 0; i < clients.length; i++) {
      users.push(clients[i].id);
    }
    client.emit('joinGame', users);
  }

  @SubscribeMessage('quitGame')
  handleQuitGame(client: Socket, roomId: number) {
    const clients = EventsGateway.clients[roomId];
    const index = clients.indexOf(client);
    if (index !== -1) {
      clients.splice(index, 1);
      for (var i = 0; i < clients.length; i++) {
        clients[i].emit('reloadGame', client.id);
      }
    }
  }

  private funcQuitLobby(client: Socket) {
    const index = EventsGateway.clients[this.lobby].indexOf(client);
    if (index !== -1) {
      EventsGateway.clients[this.lobby].splice(index, 1);
    }
  }

  private getRoomInfo(): any {
    const roomInfo = [];
    for (var i = 1; i <= EventsGateway.roomCount; i++) {
      const room = EventsGateway.clients[i];
      if (room && room.length > 0) {
        const owner = room[0];
        const members = room.length;
        const roomData = {
          roomId: i,
          owner: owner.id,
          members: members,
        };
        roomInfo.push(roomData);
      }
    }
    return roomInfo;
  }

  private getUserInfo(roomId: number): any {
    const userInfo = [];
    const room = EventsGateway.clients[roomId];
    for (var i = 0; i < room.length; i++) {
      userInfo.push(room[i].id);
    }
    return userInfo;
  }
}
