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
import { PresentationService } from "../presentation/presentation.service";
import { options } from "joi";

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
		if (!presentation) {
			this.server.emit('wait-host-create-room', { message: 'Presentation not found' });
			return;
		}
		// Reset quantity of options to 0, and set index to it
		for (const slide of presentation.slides) {
			slide.options = slide.options.map((option, index) => {
				return {
					...option,
					quantity: 0,
					index,
				}
			});
		}

		const roomId = Math.random().toString(36).slice(2, 10);
		//let host join room
		client.join(roomId);
		const room = {
			roomId,
			hostId: user._id,
			...presentation,
			userVotes: [],
			presentationId: presentation._id.toString(),
		}
		this.rooms[roomId] = room;
		this.members[user._id] = {
			...user,
			roomId,
		}
		this.server.emit('wait-host-create-room', { roomId, message: `You are host of room ${roomId}`, data: room });
	}

	@SubscribeMessage('join-room')
	public joinRoom(client: any, room): void {
		const user = client.user;
		const { roomId } = room;
		if (this.members[user._id]?.roomId === roomId) {
			this.server.to(client.id).emit('private-message', { message: `You already joined room ${roomId}` });
			this.logger.log(`User ${user.email} already joined room ${roomId}`);
			return;
		}
		client.join(roomId);
		this.members[user._id] = {
			...user,
			roomId
		}
		const roomDetail = this.rooms[roomId];
		this.server.to(roomId).emit('wait-in-room', { type: 'info', message: `User ${user.email} joined room ${roomId}` });
		this.server.to(client.id).emit('wait-join-room', { message: `You joined room ${roomId}`, data: roomDetail });
	}

	@SubscribeMessage('leave-room')
	public leaveRoom(client: any, room): void {
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
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const slide = this.rooms[roomId]?.slides.find(s => s._id.toString() === slideId);
		if (!slide) {
			this.server.to(client.id).emit('private-message', { message: `Slide ${slideId} not found` });
			this.logger.log(`Slide ${slideId} not found or not belong to presentation`);
			return;
		}
		const room = this.rooms[roomId];
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		if (room.hostId !== user._id) {
			this.server.to(client.id).emit('private-message', { message: `You are not host of room ${roomId}` });
			this.logger.log(`User ${user.email} is not host of room ${roomId}`);
			return;
		}
		room.currentSlideId = slide._id.toString();
		room.userVotes = [];
		this.server.to(roomId).emit('wait-in-room', { type: 'new-slide', message: `Host ${user.email} started slide ${slideId}`, data: slide });
	}

	@SubscribeMessage('member-vote')
	public async memberVote(client: any, data: any): Promise<void> {
		const user = client.user;
		const { slideId, optionIndex } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = this.rooms[roomId];
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		const slide = room.slides.find(s => s._id.toString() === slideId);
		if (!slide) {
			this.server.to(client.id).emit('private-message', { message: `Slide ${slideId} not found` });
			this.logger.log(`Slide ${slideId} not found or not belong to presentation`);
			return;
		}
		const option = slide.options.find(o => o.index === optionIndex);
		if (!option) {
			this.server.to(client.id).emit('private-message', { message: `Option with index ${optionIndex} not found` });
			this.logger.log(`Option with index ${optionIndex} not found`);
			return;
		}
		// //check if slide is current slide
		// if (room.currentSlideId !== slide._id.toString()) {
		// 	this.server.to(client.id).emit('private-message', { message: `Slide ${slideId} is not current slide` });
		// 	this.logger.log(`Slide ${slideId} is not current slide`);
		// 	return;
		// }
		//check if user already voted
		const isUserVoted = room.userVotes?.includes(user._id.toString());
		if (isUserVoted) {
			this.server.to(client.id).emit('private-message', { message: `User ${user.email} already voted` });
			this.logger.log(`User ${user.email} already voted`);
			return;
		}
		option.quantity += 1;
		room.userVotes.push(user._id.toString());
		this.server.to(roomId).emit('wait-in-room', { type: 'new-vote', message: `Member ${user.email} voted for option ${optionIndex}`, data: slide.options });
	}

	@SubscribeMessage('host-stop-presentation')
	public async hostStopPresentation(client: any, data: any): Promise<void> {
		const user = client.user;
		const { presentationId } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = this.rooms[roomId];
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		if (room.hostId !== user._id) {
			this.server.to(client.id).emit('private-message', { message: `You are not host of room ${roomId}` });
			this.logger.log(`User ${user.email} is not host of room ${roomId}`);
			return;
		}
		if (room.presentationId !== presentationId) {
			this.server.to(client.id).emit('private-message', { message: `Presentation ${presentationId} is not belong to room ${roomId}` });
			this.logger.log(`Presentation ${presentationId} not found or not belong to room ${roomId}`);
			return;
		}
		//update all options in each slide to new quantity, save to mongodb
		room.slides.forEach(async (slide) => {
			await this.slideService.update(slide._id, { options: slide.options }, user._id);
		});
		this.server.to(roomId).emit('wait-in-room', { type: 'stop-presentation', message: `Host ${user.email} stopped presentation ${presentationId}` });
	}
}
