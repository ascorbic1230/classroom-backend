import { Logger, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
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
import { RedisService } from "src/redis/redis.service";
import { CreateRoomDto } from "./dtos/create-room-dto";
import { RoleInGroup, RoomType } from "src/constants";
import { GroupService } from "src/group/group.service";
import * as crypto from 'crypto';
import { generateRandom8Digits } from "src/utils";

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
@UseGuards(WsJwtAuthGuard)
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger: Logger;
	private members: any[] = [];
	constructor(private readonly slideService: SlideService, private readonly presentationService: PresentationService, private readonly redisService: RedisService, private readonly groupService: GroupService) {
		this.logger = new Logger(EventsGateway.name);
	}

	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		this.logger.log(client.id.slice(0, 5) + ' connected');
	}

	handleDisconnect(client: Socket) {
		this.logger.log(client.id.slice(0, 5) + ' disconnected');
	}


	afterInit(server: Server) {
		this.logger.log('Init');
	}

	//user has to be a member of group to start-presentation, and they will be the host
	@SubscribeMessage('host-create-room')
	@UsePipes(new ValidationPipe({ transform: true }))
	public async handleHostCreateRoomEvent(client: any, data: CreateRoomDto): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} host-create-room`);
		const { presentationId, roomType, groupId } = data;
		const presentation = await this.presentationService.findById(presentationId);
		if (!presentation) {
			this.server.to(client.id).emit('private-message', { message: `Presentation not found` });
			return;
		}
		//TODO: check if user has permission with presentation
		if (roomType !== RoomType.PUBLIC && roomType !== RoomType.GROUP) {
			this.server.to(client.id).emit('private-message', { message: `Room type is invalid` });
			return;
		}
		let group;
		if (roomType === RoomType.GROUP) {
			if (!groupId) {
				this.server.to(client.id).emit('private-message', { message: `Group id is required` });
				return;
			}
			group = await this.groupService.findById(groupId);
			if (!group) {
				this.server.to(client.id).emit('private-message', { message: `Group not found` });
				return;
			}
			const userAndRole = await group.usersAndRoles.find(item => item.user._id.toString() === user._id.toString());
			if (!userAndRole) {
				this.server.to(client.id).emit('private-message', { message: `You are not in this group` });
				return;
			}
			//TODO: uncomment below
			// if (userAndRole.role !== RoleInGroup.OWNER && userAndRole.role !== RoleInGroup.CO_OWNER) {
			// 	this.server.to(client.id).emit('private-message', { message: `You are not owner or co-owner of this group` });
			// 	return;
			// }
		}
		// TODO: if presentation is group, check if these is any presentation has type is group and groupId is same in redis
		// Reset quantity of options to 0, and set index to it
		for (const slide of presentation.slides) {
			slide.options = slide.options.map((option, index) => {
				return {
					...option,
					quantity: 0,
					index,
				}
			});
			slide.userVotes = [];
		}

		const roomId = generateRandom8Digits();
		//let host join room
		client.join(roomId);
		delete presentation._id;
		const room = {
			presentationId,
			roomType,
			groupId,
			roomId,
			hostId: user._id,
			...presentation,
		}
		//terminate old room in redis if exist
		if (roomType === RoomType.GROUP) {
			const oldRoom = await this.redisService.getJson(`group-${groupId}`);
			if (oldRoom) {
				await this.terminateRoom(client, { roomId: oldRoom.roomId });
				// TODO: uncomment if needed
				// this.server.to(client.id).emit('private-message', { message: `Old room ${oldRoom.roomId} was terminated` });
			}
			const roomInfo = {
				roomId,
				groupName: group.name,
				presentationName: presentation.name,
				presentationId,
				startTime: new Date()
			}
			//
			await this.redisService.setEx(`group-${groupId}`, JSON.stringify(roomInfo));
		}
		//set room if type=group
		const slides = presentation.slides;
		room.slides = slides.map(slide => slide._id.toString());
		//set room basic info in redis
		await this.redisService.setEx(`room-${roomId}`, JSON.stringify(room));
		//set each slide in redis
		for (const slide of slides) {
			await this.redisService.setEx(`room-${roomId}-slide-${slide._id}`, JSON.stringify(slide));
		}
		this.members[user._id] = {
			...user,
			roomId,
		}
		this.server.to(client.id).emit('wait-host-create-room', { roomId, message: `You are host of room ${roomId}`, data: room });
		this.hostStartSlide(client, { roomId, slideId: slides[0]._id });
	}

	@SubscribeMessage('join-room')
	public async joinRoom(client: any, room): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} join-room as ${user.email}`);
		const { roomId } = room;
		if (this.members[user._id]?.roomId === roomId) {
			this.server.to(client.id).emit('private-message', { message: `You already joined room ${roomId}` });
			this.logger.log(`User ${user.email} already joined room ${roomId}`);
			return;
		}
		//check if room exist
		const roomInfo = await this.redisService.getJson(`room-${roomId}`);
		if (!roomInfo) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		client.join(roomId);
		this.members[user._id] = {
			...user,
			roomId
		}
		this.server.to(roomId).emit('wait-in-room', { type: 'info', message: `User ${user.email} joined room ${roomId}`, data: roomInfo });
		//TODO: return current slide.
		this.server.to(client.id).emit('wait-join-room', { message: `You joined room ${roomId}`, data: roomInfo });
	}

	@SubscribeMessage('leave-room')
	public leaveRoom(client: any, room): void {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} leave-room`);
		const { roomId } = room;
		client.leave(roomId);
		delete this.members[user._id];
		this.server.to(roomId).emit('wait-in-room', { type: 'info', message: `User ${user.email} left room ${roomId}` });
	}

	@SubscribeMessage('host-start-slide')
	public async hostStartSlide(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} host-start-slide`);
		const { slideId } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		const slide = await this.redisService.getJson(`room-${roomId}-slide-${slideId}`);
		if (!slide) {
			this.server.to(client.id).emit('private-message', { message: `Slide ${slideId} not found` });
			this.logger.log(`Slide ${slideId} not found or not belong to presentation`);
			return;
		}
		if (room.hostId !== user._id) {
			this.server.to(client.id).emit('private-message', { message: `You are not host of room ${roomId}` });
			this.logger.log(`User ${user.email} is not host of room ${roomId}`);
			return;
		}
		room.currentSlideInfo = slide;
		await this.redisService.setEx(`room-${roomId}`, JSON.stringify(room));
		this.server.to(roomId).emit('wait-in-room', { type: 'new-slide', message: `Host ${user.email} started slide ${slideId}`, data: slide });
	}

	@SubscribeMessage('member-vote')
	public async memberVote(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} member-vote`);
		const { slideId, optionIndex } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		const slide = await this.redisService.getJson(`room-${roomId}-slide-${slideId}`);
		if (!slide) {
			this.server.to(client.id).emit('private-message', { message: `Slide ${slideId} not found` });
			this.logger.log(`Slide ${slideId} not found or not belong to presentation`);
			return;
		}
		const option = slide.options[optionIndex];
		if (!option) {
			this.server.to(client.id).emit('private-message', { message: `Option with index ${optionIndex} not found` });
			this.logger.log(`Option with index ${optionIndex} not found`);
			return;
		}
		// TODO: check if slide is current slide
		// if (room.currentSlideId !== slide._id.toString()) {
		// 	this.server.to(client.id).emit('private-message', { message: `Slide ${slideId} is not current slide` });
		// 	this.logger.log(`Slide ${slideId} is not current slide`);
		// 	return;
		// }
		const isUserVoted = slide.userVotes.some((userVote) => userVote.userId === user._id.toString());
		if (isUserVoted) {
			this.server.to(client.id).emit('private-message', { message: `User ${user.email} already voted` });
			this.logger.log(`User ${user.email} already voted`);
			return;
		}
		option.quantity += 1;
		slide.userVotes.push({ user: user, optionIndex, createdAt: new Date() });
		await this.redisService.setEx(`room-${roomId}-slide-${slideId}`, JSON.stringify(slide));
		this.server.to(roomId).emit('wait-in-room', { type: 'new-vote', message: `Member ${user.email} voted for option ${optionIndex}`, data: slide.options });
	}

	@SubscribeMessage('host-stop-presentation')
	public async hostStopPresentation(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} host-stop-presentation`);
		const { presentationId } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
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
		this.server.to(roomId).emit('wait-in-room', { type: 'stop-presentation', message: `Host ${user.email} stopped presentation ${presentationId}` });
		await this.terminateRoom(client, { roomId });
	}

	@SubscribeMessage('user-terminate-room')
	public async terminateRoom(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} user-terminate-room`);
		const { roomId } = data;
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		//delete slides
		const roomSlideIds = room.slides;
		roomSlideIds.forEach(async (slideId) => {
			await this.redisService.del(`room-${roomId}-slide-${slideId}`);
		}
		);
		//delete room
		await this.redisService.del(`room-${roomId}`);
		//delete member
		delete this.members[user._id];
		//if room is group, delete group
		if (room.groupId)
			await this.redisService.del(`group-${room.groupId}`);
		this.server.to(roomId).emit('wait-in-room', { type: 'terminate-room', message: `User ${user.email} terminated room ${roomId}` });
	}

	//chat function
	@SubscribeMessage('member-chat')
	public async memberChat(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} member-chat`);
		const { message } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		await this.redisService.addToSet(`room-${roomId}-chat`, JSON.stringify({ message, user, time: new Date() }));
		this.server.to(roomId).emit('wait-in-room', { type: 'new-chat', message: `Member ${user.email} sent a message`, data: { message, user, time: new Date() } });
	}

	//question function
	@SubscribeMessage('member-question')
	public async memberAskQuestion(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} member-question`);
		const { question } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		const questionId = crypto.randomUUID();
		await this.redisService.pushEx(`room-${roomId}-question`, questionId);
		const questionDetail = { questionId, question, totalVotes: 0, isAnswered: false, user, time: new Date() }
		await this.redisService.setEx(`room-${roomId}-question-${questionId}`, JSON.stringify(questionDetail));
		this.server.to(roomId).emit('wait-in-room', {
			type: 'new-question', message: `Member ${user.email} asked a question`, data: questionDetail
		});
	}

	//upvote function
	@SubscribeMessage('member-upvote-question')
	public async memberUpvoteQuestion(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} member-upvote-question`);
		const { questionId } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		const questionDetail = await this.redisService.getJson(`room-${roomId}-question-${questionId}`);
		if (!questionDetail) {
			this.server.to(client.id).emit('private-message', { message: `Question ${questionId} not found` });
			this.logger.log(`Question ${questionId} not found`);
			return;
		}
		// TODO: Question must be from other user & Can't upvote twice.
		questionDetail.totalVotes++;
		await this.redisService.setEx(`room-${roomId}-question-${questionId}`, JSON.stringify(questionDetail));
		this.server.to(roomId).emit('wait-in-room', { type: 'upvote-question', message: `Member ${user.email} upvoted question ${questionId}`, data: questionDetail });
	}

	//answer function
	//TODO: check owner & co-owner only
	@SubscribeMessage('host-answer-question')
	public async memberAnswerQuestion(client: any, data: any): Promise<void> {
		const { user } = client
		this.logger.log(`${client.id.slice(0, 5)} host-answer-question`);
		const { questionId } = data;
		const roomId = this.members[user._id]?.roomId;
		if (!roomId) {
			this.server.to(client.id).emit('private-message', { message: `Please join room first` });
			this.logger.log(`User ${user.email} is not joined any room`);
			return;
		}
		const room = await this.redisService.getJson(`room-${roomId}`);
		if (!room) {
			this.server.to(client.id).emit('private-message', { message: `Room ${roomId} not found` });
			this.logger.log(`Room ${roomId} not found`);
			return;
		}
		const questionDetail = await this.redisService.getJson(`room-${roomId}-question-${questionId}`);
		if (!questionDetail) {
			this.server.to(client.id).emit('private-message', { message: `Question ${questionId} not found` });
			this.logger.log(`Question ${questionId} not found`);
			return;
		}
		questionDetail.isAnswered = true;
		await this.redisService.setEx(`room-${roomId}-question-${questionId}`, JSON.stringify(questionDetail));
		this.server.to(roomId).emit('wait-in-room', { type: 'answer-question', message: `${user.email} mark question ${questionId} as answered`, data: questionDetail });
	}
}