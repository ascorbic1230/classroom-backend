import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { get } from 'lodash';
import { PresentationModel, PresentationDocument } from './schemas/presentation.schema';
import { sanitizePageSize } from "../utils";
import { UserService } from "../user/user.service";
import { UserModel } from "../user/schemas/user.schema";
import { ConfigService } from "@nestjs/config";
import { PresentationDto } from "./dtos/presentation-dto";
import { SlideService } from "../slide/slide.service";
@Injectable()
export class PresentationService {

	constructor(
		@InjectModel(PresentationModel.name) private readonly presentationModel: Model<PresentationDocument>,
		private readonly userService: UserService,
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
			this.presentationModel.count(_query),
			this.presentationModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'slides', model: 'SlideModel', 'select': 'title options answer' }).lean()
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
		const presentation = await this.presentationModel.findById(id).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'slides', model: 'SlideModel', 'select': 'title options answer' }).lean();
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		return presentation;
	}

	findMyPresentation(userId: string) {
		return this.presentationModel.find({ userCreated: userId }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'slides', model: 'SlideModel', 'select': 'title options answer' }).lean();
	}

	async create(data: PresentationDto, userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		const presentation = await this.presentationModel.create({
			...data,
			slides: [],
			collaborators: [],
			userCreated: userId,
		});
		return presentation;
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
		//TODO: When delete presentation, slides should be deleted too
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		if (presentation.userCreated.toString() !== userId) throw new HttpException('You do not have permission to delete this presentation', HttpStatus.FORBIDDEN);
		return await this.presentationModel.deleteOne({ _id: id });
	}

	async addSlide(id: string, slideId: string) {
		const presentation = await this.presentationModel.findById(id);
		if (!presentation) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
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
}