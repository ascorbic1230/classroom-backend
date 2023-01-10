import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Mongoose, ObjectId, Types } from 'mongoose';
import { get } from 'lodash';
import { SlideModel, SlideDocument } from './schemas/slide.schema';
import { sanitizePageSize } from "../utils";
import { UserService } from "../user/user.service";
import { UserModel } from "../user/schemas/user.schema";
import { ConfigService } from "@nestjs/config";
import { CreateSlideDto } from "./dtos/create-slide-dto";
import { UpdateSlideDto } from "./dtos/update-slide-dto";
import { PresentationService } from "../presentation/presentation.service";
import { SlideType } from "src/constants";
@Injectable()
export class SlideService {

	constructor(
		@InjectModel(SlideModel.name) private readonly slideModel: Model<SlideDocument>,
		private readonly userService: UserService,
		@Inject(forwardRef(() => PresentationService))
		private readonly presentationService: PresentationService,
		private readonly configService: ConfigService
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
			this.slideModel.count(_query),
			this.slideModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).lean()
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
			message: 'Get list slide successfully',
		};
	}

	async findById(id: string): Promise<any> {
		const slide = await this.slideModel.findById(id).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).lean();
		if (!slide) throw new HttpException('Slide not found', HttpStatus.NOT_FOUND);
		return slide;
	}


	async createSlideOnly(data: CreateSlideDto, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const presentationId = data.presentationId;
		if (!presentationId) throw new HttpException('Presentation id is required', HttpStatus.BAD_REQUEST);
		const slide = new this.slideModel({
			userCreated: userId,
			userUpdated: userId,
		});
		if (data.slideType) {
			if (data.slideType === SlideType.MULTIPLE_CHOICE)
				data.content = '';
			else
				data.options = [];
		}
		slide.set(data);
		const result = await slide.save();
		return result;
	}

	async create(data: CreateSlideDto, userId: string) {
		const slideId = new Types.ObjectId();
		await this.presentationService.addSlide(data.presentationId, slideId.toString());
		const slide = await this.createSlideOnly({ ...data, _id: slideId.toString() }, userId);
		return slide;
	}

	async update(id: string, data: UpdateSlideDto, userId: string) {
		const slide = await this.slideModel.findById(id);
		if (!slide) throw new HttpException('Slide not found', HttpStatus.NOT_FOUND);
		if (data.slideType) {
			if (data.slideType === SlideType.MULTIPLE_CHOICE)
				data.content = '';
			else
				data.options = [];
		}
		slide.set(data);
		slide.userUpdated = userId as any;
		const result = await slide.save();
		return result;
	}

	async delete(id: string, userId: string) {
		const slide = await this.slideModel.findById(id);
		if (!slide) throw new HttpException('Slide not found', HttpStatus.NOT_FOUND);
		await this.slideModel.deleteOne({ _id: id });
		await this.presentationService.removeSlide(slide.presentationId.toString(), id);
	}
}