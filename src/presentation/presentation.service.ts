import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { get } from 'lodash';
import { PresentationModel, PresentationDocument } from './schemas/presentation.schema';
import { sanitizePageSize } from "../utils";
import { UserService } from "../user/user.service";
import { UserModel } from "../user/schemas/user.schema";
import { ConfigService } from "@nestjs/config";
import { PresentationDto } from "./dtos/presentation-dto";
import { SlideService } from "../slide/slide.service";
import { SlideModel } from "../slide/schemas/slide.schema";
import { RoomType, SlideType } from "src/constants";
import { RedisService } from "src/redis/redis.service";
import { GetChatDto } from "./dtos/get-chat-dto";
@Injectable()
export class PresentationService {

	constructor(
		@InjectModel(PresentationModel.name) private readonly presentationModel: Model<PresentationDocument>,
		private readonly userService: UserService,
		@Inject(forwardRef(() => SlideService))
		private readonly slideService: SlideService,
		private readonly configService: ConfigService,
		private readonly redisService: RedisService
	) { }

	//Admin Route
	async findAll(query: any): Promise<any> {
		const _size = Number(get(query, 'size', 10));
		const _page = Number(get(query, 'page', 1));
		const { limit, skip } = sanitizePageSize(_page, _size);
		const { size, page, ...remain } = query;
		const _query = {};
		Object.keys(remain).forEach(key => {
			const _value = get(query, key, '');
			if (_value) _query[key] = {
				$regex: _value,
				$options: 'i'
			}
		});
		const [total, data] = await Promise.all([
			this.presentationModel.count(_query),
			this.presentationModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 })
				.populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' })
				.populate({ path: 'collaborators', model: UserModel.name, select: 'name email avatarUrl' })
				.populate({ path: 'slides', model: SlideModel.name, 'select': 'title content slideType options' })
				.lean()
		]);
		return {
			statusCode: HttpStatus.OK,
			data,
			meta: {
				currentPage: +_page,
				pageSize: +_size,
				totalPages: Math.ceil(total / _size),
				totalRows: total,
			},
			message: 'Get list presentation successfully',
		};
	}

	async findById(id: string): Promise<any> {
		const presentation = await this.presentationModel.findById(id)
			.populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' })
			.populate({ path: 'collaborators', model: UserModel.name, select: 'name email avatarUrl' })
			.populate({ path: 'slides', model: SlideModel.name, 'select': 'title content slideType options' })
			.lean()
		return presentation;
	}

	findMyPresentation(userId: string) {
		return this.presentationModel.find({ $or: [{ userCreated: userId }, { collaborators: userId }] })
			.populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' })
			.populate({ path: 'collaborators', model: UserModel.name, select: 'name email avatarUrl' })
			.populate({ path: 'slides', model: SlideModel.name, 'select': 'title content slideType options' })
			.lean()
	}

	async create(data: PresentationDto, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const presentationId = new Types.ObjectId();
		const slide = await this.slideService.createSlideOnly({ presentationId: presentationId.toString(), slideType: SlideType.MULTIPLE_CHOICE }, userId);
		const presentation = await this.presentationModel.create({
			...data,
			slides: [slide._id],
			collaborators: [],
			userCreated: userId,
			_id: presentationId
		});
		// bad code
		const result = presentation.toObject();
		result.slides = [{ title: slide.title, content: slide.content, options: slide.options, slideType: slide.slideType, _id: slide._id }];
		return result;
	}

	async update(id: string, data: PresentationDto, userId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		const hasPermission = presentation.userCreated.toString() === userId || presentation.collaborators.map(item => item.toString()).includes(userId);
		if (!hasPermission) throw new HttpException('You do not have permission to update this presentation', HttpStatus.FORBIDDEN);
		return this.presentationModel.findOneAndUpdate({ _id: id }, {
			...data,
			userUpdated: userId,
		}, { new: true });
	}

	async delete(id: string, userId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		if (presentation.userCreated.toString() !== userId) throw new HttpException('You do not have permission to delete this presentation', HttpStatus.FORBIDDEN);
		for (const slide of presentation.slides) {
			await this.slideService.delete(slide.toString(), userId);
		}
		return await this.presentationModel.deleteOne({ _id: id });
	}

	async addSlide(id: string, slideId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		for (const slide of presentation.slides) {
			if (slide.toString() === slideId) throw new HttpException('Slide already exists', HttpStatus.BAD_REQUEST);
		}
		await this.presentationModel.updateOne({
			_id: id
		}, {
			$push: {
				slides: slideId
			}
		});
		return presentation;
	}

	async removeSlide(id: string, slideId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		await this.presentationModel.updateOne({
			_id: id
		}, {
			$pull: {
				slides: slideId
			}
		});
		return presentation;
	}

	async addCollaborator(id: string, data: { email: string }, userId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		if (presentation.userCreated.toString() !== userId) throw new HttpException('You do not have permission to add collaborator to this presentation', HttpStatus.FORBIDDEN);
		const collaboratorToAdd = await this.userService.findByEmail(data.email);
		if (!collaboratorToAdd) throw new HttpException('Collaborator not found', HttpStatus.NOT_FOUND);
		if (collaboratorToAdd._id.toString() === userId) throw new HttpException('You cannot add yourself as a collaborator', HttpStatus.BAD_REQUEST);
		for (const collaborator of presentation.collaborators) {
			if (collaborator.toString() === collaboratorToAdd._id.toString()) throw new HttpException('Collaborator already exists', HttpStatus.BAD_REQUEST);
		}
		presentation.collaborators.push(collaboratorToAdd._id);
		return await presentation.save();
	}

	async removeCollaborator(id: string, data: { email: string }, userId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		if (presentation.userCreated.toString() !== userId) throw new HttpException('You do not have permission to remove collaborator of this presentation', HttpStatus.FORBIDDEN);
		const collaborToRemove = await this.userService.findByEmail(data.email);
		if (!collaborToRemove) throw new HttpException('Collaborator not found', HttpStatus.NOT_FOUND);
		if (collaborToRemove._id.toString() === userId) throw new HttpException('You cannot add yourself as a collaborator', HttpStatus.BAD_REQUEST);
		if (!presentation.collaborators.map(item => item.toString()).includes(collaborToRemove._id.toString())) throw new HttpException('Collaborator does not exist', HttpStatus.BAD_REQUEST);
		presentation.collaborators = presentation.collaborators.filter(collaborator => collaborator.toString() !== collaborToRemove._id.toString());
		return await presentation.save();
	}


	async getSocketRoom(roomId: string, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const roomInfo = await this.redisService.getJson(`room-${roomId}`);
		if (!roomInfo) throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
		if (roomInfo.roomType === RoomType.GROUP) {
			const isMyGroup = user.groups.find(group => group.toString() === roomInfo.groupId);
			if (!isMyGroup) throw new HttpException('You do not have permission to join this room', HttpStatus.FORBIDDEN);
		}
		return roomInfo;
	}

	async getChats(roomId: string, userId: string, query: GetChatDto) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const roomInfo = await this.redisService.getJson(`room-${roomId}`);
		if (!roomInfo) throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
		if (roomInfo.roomType === RoomType.GROUP) {
			const isMyGroup = user.groups.find(group => group.toString() === roomInfo.groupId);
			if (!isMyGroup) throw new HttpException('You do not have permission to join this room', HttpStatus.FORBIDDEN);
		}
		const setSize = await this.redisService.getSetLength(`room-${roomId}-chat`);
		let { offset = setSize - 1, size = 10 } = query;
		offset = offset < 0 ? 0 : offset * 1;
		size = size < 0 ? 0 : size * 1;
		const startIndex = offset - size + 1;
		const nextOffset = startIndex <= 0 ? undefined : startIndex - 1;
		const data = await this.redisService.getRangeInSetJson(`room-${roomId}-chat`, startIndex, offset);
		const meta = {
			offset,
			nextOffset,
			total: setSize
		}
		return { data, meta };
	}

	async getQuestions(roomId: string, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const roomInfo = await this.redisService.getJson(`room-${roomId}`);
		if (!roomInfo) throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
		if (roomInfo.roomType === RoomType.GROUP) {
			const isMyGroup = user.groups.find(group => group.toString() === roomInfo.groupId);
			if (!isMyGroup) throw new HttpException('You do not have permission to join this room', HttpStatus.FORBIDDEN);
		}
		const questionIds = await this.redisService.getList(`room-${roomId}-question`);
		if (questionIds) {
			const questions = [];
			for (const questionId of questionIds) {
				const question = await this.redisService.getJson(`room-${roomId}-question-${questionId}`);
				if (question) questions.push(question);
			}
			return questions;
		}
		return [];
	}

	//user will get this api every 5s to check if there is any new presentation
	async checkActiveGroupPresentation(userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		let activeGroups = [];
		for (const group of user.groups) {
			const activeGroup = await this.redisService.getJson(`group-${group.toString()}`);
			if (activeGroup) {
				const minuteDiff = new Date().getMinutes() - new Date(activeGroup.startTime).getMinutes();
				activeGroup.message = `Group ${activeGroup.groupName} is presenting (${minuteDiff} minutes before)`;
				activeGroups.push(activeGroup);
			}
		}
		return activeGroups;
	}

	async getSubmitResult(roomId: string, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const roomInfo = await this.redisService.getJson(`room-${roomId}`);
		if (!roomInfo) throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
		//TODO: check userId role in group, etc...
		let results = [];
		for (const slideId of roomInfo.slides) {
			const result = await this.redisService.getJson(`room-${roomId}-slide-${slideId}`);
			if (result) results.push(result);
		}
		return results;
	}

}