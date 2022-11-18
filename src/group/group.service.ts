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
	findById(id: string) {
		return this.groupModel.findById(id).lean();
	}

	async create(query: any, user: any) {
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
		return group;
	}

	update(id: string, query: any) {
		const { _id, name, description } = query;
		if (!_id) throw new HttpException('_id is required', HttpStatus.BAD_REQUEST);
		return this.groupModel.findOneAndUpdate({ _id }, {
			name,
			description,
			userUpdated: id,
		}, { new: true });
	}

	findMyCreatedGroup(userId: string) {
		return this.groupModel.find({ userCreated: userId }).lean();
	}

	findMyGroup(userId: string): Promise<any> {
		return this.userService.findMyGroup(userId);
	}

	//create link to invite user to group
	async getInviteLink(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = group.usersAndRoles.find(item => item.userId.toString() === userId);
		if (!userAndRole) throw new HttpException('You are not member of this group', HttpStatus.BAD_REQUEST);
		return `${this.configService.get('BASE_URL')}/group/${groupId}/join`;
	}

	async joinGroup(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = await group.usersAndRoles.find(item => item.userId.toString() === userId);
		if (userAndRole) throw new HttpException('You are already in this group', HttpStatus.BAD_REQUEST);
		await this.groupModel.updateOne({
			_id: groupId
		}, {
			$push: {
				usersAndRoles: {
					userId,
					role: RoleInGroup.MEMBER,
				}
			}
		});
		return await this.userService.joinGroup(userId, groupId);
	}

	async leaveGroup(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = await group.usersAndRoles.find(item => item.userId.toString() === userId);
		if (!userAndRole) throw new HttpException('You are not member of this group', HttpStatus.BAD_REQUEST);
		//if group.usersAndRoles.length === 1 => delete group
		if (group.usersAndRoles.length === 1) {
			await this.userService.leaveGroup(userId, groupId);
			return await this.groupModel.deleteOne({
				_id: groupId
			});
		}
		//if role is owner, can not leave group
		if (userAndRole.role === RoleInGroup.OWNER) throw new HttpException('Cannot leave group since you are owner. Please transfer ownership to other member', HttpStatus.BAD_REQUEST);
		console.log('userAndRoleToKick', userAndRole);
		await this.groupModel.updateOne({
			_id: groupId
		}, {
			$pull: {
				usersAndRoles: {
					_id: userAndRole._id
				}
			}
		});

		return await this.userService.leaveGroup(userId, groupId);
	}

	async kickUser(userId: string, groupId: string, userIdToKick: string): Promise<any> {
		console.log('id To kick', userIdToKick);
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = await group.usersAndRoles.find(item => item.userId.toString() === userId && (item.role === RoleInGroup.OWNER || item.role === RoleInGroup.CO_OWNER));
		if (!userAndRole) throw new HttpException('You are not owner or co-owner of this group', HttpStatus.BAD_REQUEST);
		const userAndRoleToKick = await group.usersAndRoles.find(item => item.userId.toString() === userIdToKick);
		if (!userAndRoleToKick) throw new HttpException('User to kick is not a member of this group', HttpStatus.BAD_REQUEST);
		//if role is owner, can not kick
		if (userAndRoleToKick.role === RoleInGroup.OWNER) throw new HttpException('Cannot kick owner', HttpStatus.BAD_REQUEST);
		await this.groupModel.updateOne({
			_id: groupId
		}, {
			$pull: {
				usersAndRoles: {
					_id: userAndRole._id
				}
			}
		});
		return await this.userService.leaveGroup(userIdToKick, groupId);
	}
}