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
@Injectable()
export class PresentationService {

	constructor(
		@InjectModel(PresentationModel.name) private readonly presentationModel: Model<PresentationDocument>,
		private readonly userService: UserService,
		@Inject(forwardRef(() => SlideService))
		private readonly slideService: SlideService,
		private readonly configService: ConfigService,
		private readonly redisSerivce: RedisService
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
			this.presentationModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'slides', model: SlideModel.name, 'select': 'title content slideType options' }).lean()
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
		const presentation = await this.presentationModel.findById(id).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'slides', model: 'SlideModel', 'select': 'title content slideType options ' }).lean();
		return presentation;
	}

	findMyPresentation(userId: string) {
		return this.presentationModel.find({ userCreated: userId }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'slides', model: 'SlideModel', 'select': 'title content slideType options ' }).lean();
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
		if (presentation.userCreated.toString() !== userId) throw new HttpException('You do not have permission to update this presentation', HttpStatus.FORBIDDEN);
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

	async getSocketRoom(roomId: string, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const roomInfo = await this.redisSerivce.getJson(`room-${roomId}`);
		if (!roomInfo) throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
		if (roomInfo.roomType === RoomType.GROUP) {
			const isMyGroup = user.groups.find(group => group.toString() === roomInfo.groupId);
			if (!isMyGroup) throw new HttpException('You do not have permission to join this room', HttpStatus.FORBIDDEN);
		}
		const chats = await this.redisSerivce.getListJson(`room-${roomId}-chat`);
		if (chats) roomInfo.chats = chats;
		const questionIds = await this.redisSerivce.getList(`room-${roomId}-question`);
		if (questionIds) {
			const questions = [];
			for (const questionId of questionIds) {
				const question = await this.redisSerivce.getJson(`room-${roomId}-question-${questionId}`);
				if (question) questions.push(question);
			}
			roomInfo.questions = questions;
		}
		return roomInfo;
	}

	//user will get this api every 5s to check if there is any new presentation
	async checkActiveGroupPresentation(userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		let activeGroups = [];
		for (const group of user.groups) {
			const activeGroup = await this.redisSerivce.getJson(`group-${group.toString()}`);
			if (activeGroup) {
				const minuteDiff = new Date().getMinutes() - new Date(activeGroup.startTime).getMinutes();
				activeGroup.message = `Group ${activeGroup.groupName} is presenting (${minuteDiff} minutes before)`;
				//join link mấy a tự tạo ở frontend nha
				activeGroups.push(activeGroup);
			}
		}
		return activeGroups;
	}

	async getSubmitResult(roomId: string, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const roomInfo = await this.redisSerivce.getJson(`room-${roomId}`);
		if (!roomInfo) throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
		//TODO: check userId role in group, etc...
		let results = [];
		for (const slideId of roomInfo.slides) {
			const result = await this.redisSerivce.getJson(`room-${roomId}-slide-${slideId}`);
			if (result) results.push(result);
		}
		return results;
	}
}