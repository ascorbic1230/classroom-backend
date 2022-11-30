import { Injectable } from '@nestjs/common';
@Injectable()
export class AppService {
	getHello(): string {
		return 'Welcome to TAT\'s Classroom! (Made by Huỳnh Minh Thắng - Nguyễn Quốc Toàn - Nguyễn Thanh An)';
	}
}
