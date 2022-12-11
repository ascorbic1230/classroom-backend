import { Logger, UseGuards } from "@nestjs/common";
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SlideService } from "../slide/slide.service";
import { WsJwtAuthGuard } from "../guards/ws-jwt.guard";
import { JoinRoomDto } from "./dtos/join-room.dto";
import { PresentationService } from "../presentation/presentation.service";

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
@UseGuards(WsJwtAuthGuard)
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger: Logger;
	private members: any[] = [];
	private rooms: any[] = [];
	constructor(private readonly slideService: SlideService, private readonly presentationService: PresentationService) {
		this.logger = new Logger(EventsGateway.name);
	}

	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		this.logger.log('Client connected ' + client.id);
	}

	handleDisconnect(client: Socket) {
		this.logger.log('Client disconnected ' + client.id);
	}


	afterInit(server: Server) {
		this.logger.log('Init');
	}


	@SubscribeMessage('host-create-room')
	public async handleHostCreateRoomEvent(client: any, data: any): Promise<void> {
		const user = client.user;
		const { presentationId } = data;
		const presentation = await this.presentationService.findById(presentationId);
		const roomId = Math.random().toString(36).slice(2, 10);
		//let host join room
		client.join(roomId);
		const room = {
			roomId,
			hostId: user._id,
			...presentation
		}
		this.rooms[roomId] = room;
		this.members[user._id] = {
			...user,
			roomId,
		}
		this.server.emit('wait-host-create-room', { roomId, message: `You are host of room ${roomId}` });
	}

	@SubscribeMessage('join-room')
	public joinRoom(client: any, room: JoinRoomDto): void {
		const user = client.user;
		const { roomId } = room;
		if (this.members[user._id]?.roomId === roomId) {
			this.logger.log(`User ${user.email} already joined room ${roomId}`);
			return;
		}
		client.join(roomId);
		this.members[user._id] = {
			...user,
			roomId
		}
		this.server.to(roomId).emit('wait-in-room', { type: 'info', message: `User ${user.email} joined room ${roomId}` });
	}

	@SubscribeMessage('leave-room')
	public leaveRoom(client: any, room: JoinRoomDto): void {
		const user = client.user;
		const { roomId } = room;
		client.leave(roomId);
		delete this.members[user._id];
		this.server.to(roomId).emit('wait-in-room', { type: 'info', message: `User ${user.email} left room ${roomId}` });
	}

	@SubscribeMessage('host-start-slide')
	public async hostStartSlide(client: any, data: any): Promise<void> {
		const user = client.user;
		const { slideId } = data;
		const roomId = this.members[user._id]?.roomId;
		const slide = await this.slideService.findById(slideId);
		const room = this.rooms[roomId];
		if (!room) {
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		if (room.hostId !== user._id) {
			this.logger.log(`User ${user.email} is not host of room ${roomId}`);
			return;
		}
		this.server.to(roomId).emit('wait-in-room', { type: 'new-slide', message: `Host ${user.email} started slide ${slideId}`, data: slide });
	}
}
