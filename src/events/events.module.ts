import { Module } from '@nestjs/common';
import { GameService } from 'src/game/game.service';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway, GameService],
})
export class EventsModule {}  