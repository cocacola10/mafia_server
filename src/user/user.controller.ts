import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

  @Get(':userId')
  async getUserInfo(@Param('userId') userId: string): Promise<any> {
    return this.userService.getUserInfo(userId);
  }
}
