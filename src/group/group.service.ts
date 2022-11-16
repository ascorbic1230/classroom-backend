import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { get } from 'lodash';
import { GroupModel, GroupDocument } from './schemas/group.schema';
import { sanitizePageSize } from "@/utils";
import { UserService } from "@/user/user.service";
import { UserModel } from "@/user/schemas/user.schema";
@Injectable()
export class GroupService {

	constructor(@InjectModel(GroupModel.name) private readonly groupModel: Model<GroupDocument>, private readonly userService: UserService) { }

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
			this.groupModel.count(_query),
			this.groupModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 }).lean()
		]);
		return {
			data,
			meta: {
				currentPage: +_page,
				pageSize: +_size,
				totalPages: Math.ceil(total / _size),
				totalRows: total,
			},
		};
	}

	//Admin Route
	async findById(id: string): Promise<any> {
		const group = await this.groupModel
			.findById(id)
			.populate({
				path: 'users',
				model: UserModel.name,
				select: 'name email'
			})
			.lean();
		return group;
	}

	async create(query: any, user): Promise<any> {
		const { name, description } = query;
		if (!name) throw new HttpException('name is required', HttpStatus.BAD_REQUEST);
		const group = await this.groupModel.create({
			name,
			description,
			userCreated: user._id,
			userUpdated: user._id,
			users: [user._id],
		});
		await this.userService.joinGroup(user._id, group._id);
		return group;
	}

	async update(id: string, query: any): Promise<any> {
		const { _id, name, description } = query;
		if (!_id) throw new HttpException('_id is required', HttpStatus.BAD_REQUEST);
		const group = await this.groupModel.findOneAndUpdate({ _id }, {
			name,
			description,
			userUpdated: id,
		}, { new: true });
		return group;;
	}

	async findMyCreatedGroup(userId: string): Promise<any> {
		const groups = await this.groupModel.find({ userCreated: userId }).lean();
		return groups;
	}

	async findMyGroup(userId: string): Promise<any> {
		const groups = await this.userService.findMyGroup(userId);
		return groups;
	}
}