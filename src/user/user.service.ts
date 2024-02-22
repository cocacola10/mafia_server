import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    async getUserInfo(userId: string): Promise<any> {
        // 데이터베이스에서 사용자 정보를 가져오는 로직을 구현
        return { id: userId, name: 'John Doe', email: 'john@example.com' };
      }
}
