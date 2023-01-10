import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { get } from 'lodash';
import { GroupModel, GroupDocument } from './schemas/group.schema';
import { generateRandomString, sanitizePageSize } from "../utils";
import { UserService } from "../user/user.service";
import { UserModel } from "../user/schemas/user.schema";
import { RoleInGroup } from "../constants";
import { ConfigService } from "@nestjs/config";
import { AssignRoleDto } from "./dtos/user-and-role.dto";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../mail/mail.service";
import { RedisService } from "src/redis/redis.service";
@Injectable()
export class GroupService {

	private prefixGroupJoinCode = 'group.join.code'

	constructor(
		@InjectModel(GroupModel.name) private readonly groupModel: Model<GroupDocument>,
		private readonly userService: UserService,
		private readonly configService: ConfigService,
		private readonly mailService: MailService,
		private readonly redisService: RedisService,
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
			this.groupModel.count(_query),
			this.groupModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).lean()
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
		// return this.groupModel.findById(id).populate('usersAndRoles.userId');
		return this.groupModel.findById(id).populate({ path: 'usersAndRoles.user', model: UserModel.name, select: 'name email avatarUrl' }).populate({ path: 'userCreated', model: UserModel.name, select: 'name email avatarUrl' }).lean();
	}

	async create(data: any, user: any) {
		const { name, description } = data;
		if (!name) throw new HttpException('name is required', HttpStatus.BAD_REQUEST);
		const group = await this.groupModel.create({
			name,
			description,
			userCreated: user._id,
			userUpdated: user._id,
			usersAndRoles: [{
				user: user._id,
				role: RoleInGroup.OWNER,
			}]
		});
		await this.userService.joinGroup(user._id, group._id);
		return group;
	}

	update(id: string, data: any) {
		const { _id, name, description } = data;
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

	findActivePresentation(groupId: string) {
		return this.redisService.getJson(`group-${groupId}`);
	}

	async leaveGroup(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = await group.usersAndRoles.find(item => item.user.toString() === userId);
		if (!userAndRole) throw new HttpException('You are not member of this group', HttpStatus.BAD_REQUEST);
		//if role is owner, can not leave group
		if (userAndRole.role === RoleInGroup.OWNER) throw new HttpException('Cannot leave group since you are owner. Please delete group instead', HttpStatus.BAD_REQUEST);
		await this.groupModel.updateOne({
			_id: groupId
		}, {
			$pull: {
				usersAndRoles: {
					user: userAndRole.user
				}
			}
		});

		return await this.userService.leaveGroup(userId, groupId);
	}

	async kickUser(userId: string, groupId: string, userIdToKick: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = await group.usersAndRoles.find(item => item.user.toString() === userId && (item.role === RoleInGroup.OWNER || item.role === RoleInGroup.CO_OWNER));
		if (!userAndRole) throw new HttpException('You are not owner or co-owner of this group', HttpStatus.BAD_REQUEST);
		const userAndRoleToKick = await group.usersAndRoles.find(item => item.user.toString() === userIdToKick);
		if (!userAndRoleToKick) throw new HttpException('User to kick is not a member of this group', HttpStatus.BAD_REQUEST);
		//can not kick owner
		if (userAndRoleToKick.role === RoleInGroup.OWNER) throw new HttpException('Cannot kick owner', HttpStatus.BAD_REQUEST);
		await this.groupModel.updateOne({
			_id: groupId
		}, {
			$pull: {
				usersAndRoles: {
					user: userAndRoleToKick.user
				}
			}
		});
		return await this.userService.leaveGroup(userIdToKick, groupId);
	}

	async deleteGroup(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		if (group.userCreated.toString() !== userId) throw new HttpException('You are not owner of this group', HttpStatus.BAD_REQUEST);
		if (group.usersAndRoles.length > 1) throw new HttpException('Cannot delete group since there are other members', HttpStatus.BAD_REQUEST);
		await this.userService.leaveGroup(userId, groupId);
		return await this.groupModel.deleteOne({
			_id: groupId
		});
	}

	//assign role to user in Group
	async assignRole(userId: string, groupId: string, userToAssignRole: AssignRoleDto): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = await group.usersAndRoles.find(item => item.user.toString() === userId && (item.role === RoleInGroup.OWNER || item.role === RoleInGroup.CO_OWNER));
		if (!userAndRole) throw new HttpException('You are not owner or co-owner of this group', HttpStatus.BAD_REQUEST);
		const userAndRoleToAssign = await group.usersAndRoles.find(item => item.user.toString() === userToAssignRole.user);
		if (!userAndRoleToAssign) throw new HttpException('User to assign is not a member of this group', HttpStatus.BAD_REQUEST);
		//can not assign owner a new role
		if (userAndRoleToAssign.role === RoleInGroup.OWNER) throw new HttpException('Cannot assign owner', HttpStatus.BAD_REQUEST);
		return await this.groupModel.updateOne({
			_id: groupId,
			'usersAndRoles.user': userToAssignRole.user
		}, {
			$set: {
				'usersAndRoles.$.role': userToAssignRole.role
			}
		});
	}

	//create link to invite user to group
	async getInviteLink(userId: string, groupId: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = group.usersAndRoles.find(item => item.user.toString() === userId);
		if (!userAndRole) throw new HttpException('You are not member of this group', HttpStatus.BAD_REQUEST);
		const code = generateRandomString();
		await this.redisService.setEx(`${this.prefixGroupJoinCode}-${code}`, JSON.stringify({ groupId }));
		return `${this.configService.get('FRONTEND_URL')}/group/invite?token=${code}`;
	}

	async joinGroupByInviteLink(user: any, token: string): Promise<any> {
		const payload = await this.redisService.getJson(`${this.prefixGroupJoinCode}-${token}`);
		const group = await this.groupModel.findById(payload.groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = group.usersAndRoles.find(item => item.user.toString() === user._id);
		if (userAndRole) throw new HttpException('You are already in this group', HttpStatus.BAD_REQUEST);
		if (payload.emailToInvite && payload.emailToInvite !== user.email) throw new HttpException('You are not invited to this group', HttpStatus.BAD_REQUEST);
		await this.groupModel.updateOne({
			_id: payload.groupId
		}, {
			$push: {
				usersAndRoles: {
					user: user._id,
					role: RoleInGroup.MEMBER,
				}
			}
		});
		const result = await this.userService.joinGroup(user._id, payload.groupId);
		return group;
	}

	async inviteUserViaEmail(user: any, groupId: string, emailToInvite: string): Promise<any> {
		const group = await this.groupModel.findById(groupId).lean();
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		const userAndRole = group.usersAndRoles.find(item => item.user.toString() === user._id);
		if (!userAndRole) throw new HttpException('You are not member of this group', HttpStatus.BAD_REQUEST);
		const code = generateRandomString();
		await this.redisService.setEx(`${this.prefixGroupJoinCode}-${code}`, JSON.stringify({ groupId, emailToInvite }));
		const url = `${this.configService.get('FRONTEND_URL')}/group/invite?token=${code}`;
		await this.mailService.sendInviteEmail(emailToInvite, url, group.name, user);
	}
}