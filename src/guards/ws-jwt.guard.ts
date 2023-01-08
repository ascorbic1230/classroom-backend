import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserService } from "../user/user.service";

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
	private readonly logger: Logger;

	constructor(private readonly jwtService: JwtService, private readonly userService: UserService) {
		this.logger = new Logger(WsJwtAuthGuard.name);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {

		try {
			const client: Socket = context.switchToWs().getClient<Socket>();
			let authToken = client.handshake?.headers?.authorization?.toString();
			if (!authToken) {
				this.logger.log('No auth token');
				return false;
			}
			if (authToken.startsWith('Bearer ')) {
				authToken = authToken.slice(7, authToken.length);
			}
			const { email } = await this.jwtService.verifyAsync(authToken);
			const user = await this.userService.findByEmail(email);
			const userResult = { _id: user?._id.toString(), email: user?.email, name: user?.name };
			context.switchToWs().getClient().user = userResult;

			return Boolean(user);
		} catch (err) {
			throw new WsException(err.message);
		}
	}
}