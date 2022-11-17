import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { get } from 'lodash';
import { GroupModel, GroupDocument } from './schemas/group.schema';
import { sanitizePageSize } from "@/utils";
import { UserService } from "@/user/user.service";
import { UserModel } from "@/user/schemas/user.schema";
import { RoleInGroup } from "@/constants";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class GroupService {

	constructor(@InjectModel(GroupModel.name) private readonly groupModel: Model<GroupDocument>, private readonly userService: UserService, private configService: ConfigService) { }

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
			statusCode: HttpStatus.OK,
			data,
			meta: {
				currentPage: +_page,
				pageSize: +_size,
				totalPages: Math.ceil(total / _size),
				totalRows: total,
			},
			message: 'Get list group successfully',
		};
	}

	//Admin Route
	async findById(id: string): Promise<any> {
		const group = await this.groupModel
			.findById(id)
			.populate('usersAndRoles.userId')
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Find group successfully',
		}
	}

	async create(query: any, user: any): Promise<any> {
		const { name, description } = query;
		if (!name) throw new HttpException('name is required', HttpStatus.BAD_REQUEST);
		const group = await this.groupModel.create({
			name,
			description,
			userCreated: user._id,
			userUpdated: user._id,
			usersAndRoles: [{
				userId: user._id,
				role: RoleInGroup.OWNER,
			}]
		});
		await this.userService.joinGroup(user._id, group._id);
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Create group successfully',
		}
	}

	async update(id: string, query: any): Promise<any> {
		const { _id, name, description } = query;
		if (!_id) throw new HttpException('_id is required', HttpStatus.BAD_REQUEST);
		const group = await this.groupModel.findOneAndUpdate({ _id }, {
			name,
			description,
			userUpdated: id,
		}, { new: true });
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Update group successfully',
		}
	}

	async findMyCreatedGroup(userId: string): Promise<any> {
		const groups = await this.groupModel.find({ userCreated: userId }).lean();
		return {
			statusCode: HttpStatus.OK,
			data: groups,
			message: 'Get my created group successfully',
		}
	}

	async findMyGroup(userId: string): Promise<any> {
		const groups = await this.userService.findMyGroup(userId);
		return {
			statusCode: HttpStatus.OK,
			data: groups,
			message: 'Get my group successfully',
		}
	}

	//create link to invite user to group
	async getInviteLink(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel
			.findById(groupId)
			.lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		console.log('group', group);
		const isMember = group.usersAndRoles.find(item => item.userId.toString() === userId);
		console.log('group', group);
		console.log('userId', userId);
		if (!isMember) throw new HttpException('You are not member of this group', HttpStatus.BAD_REQUEST);
		const inviteLink = `${this.configService.get('BASE_URL')}/group/${groupId}/join`;
		return {
			statusCode: HttpStatus.OK,
			data: inviteLink,
			message: 'Get invite link successfully',
		}
	}

	async joinGroup(userId: string, groupId: string): Promise<any> {
		const isInGroup = await this.groupModel.findOne({ _id: groupId, 'usersAndRoles.userId': userId });
		if (isInGroup) throw new HttpException('You are already in this group', HttpStatus.BAD_REQUEST);
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const user = await this.userService.findById(userId);
		if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		await this.groupModel.findOneAndUpdate({
			_id: groupId
		}, {
			$push: {
				usersAndRoles: {
					userId,
					role: RoleInGroup.MEMBER,
				}
			}
		});
		await this.userService.joinGroup(userId, groupId);
		return {
			statusCode: HttpStatus.OK,
			message: 'Join group successfully'
		}
	}

}