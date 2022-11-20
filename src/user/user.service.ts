import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from './schemas/user.schema';
import { JwtService } from "@nestjs/jwt";
import { GroupModel } from "@/group/schemas/group.schema";
import { ChangePasswordDto } from "@/auth/dtos/auth.dto";
import { hashPassword } from "@/utils";
import { UpdateAccountDto } from "./dtos/update-account.dto";
@Injectable()
export class UserService {
	constructor(
		@InjectModel(UserModel.name)
		private userModel: Model<UserDocument>,
		private jwtService: JwtService
	) { }

	//Admin Route
	findAll(filter) {
		return this.userModel.find(filter);
	}

	findByEmail(email: string) {
		return this.userModel.findOne({ email });
	}

	create(dto: any) {
		return this.userModel.create(dto);
	}

	async update(id: string, dto: UpdateAccountDto) {
		const result = await this.userModel.findByIdAndUpdate(id, dto, { new: true });
		delete result.password;
		return result;
	}

	delete(id: string) {
		return this.userModel.findByIdAndDelete(id);
	}

	generateJWT(user: any) {
		const payload = { email: user.email, name: user.name };
		return this.jwtService.sign(payload);
	}

	//TODO: should use redis instead
	generateJWTAsVerificationCode(user: any) {
		const payload = { email: user.email, name: user.name };
		return this.jwtService.sign(payload, { expiresIn: '1h' });
	}

	//check verification code
	async verifyEmail(verificationCode: string) {
		const decoded = this.jwtService.verify(verificationCode);
		const user = await this.userModel.findOne({ email: decoded.email });
		if (!user) {
			throw new Error('User not found');
		}
		user.isEmailVerified = true;
		await user.save();
		return user;
	}

	async isInGroup(userId: string, groupId: string) {
		const user = await this.userModel
			.findById(userId)
			.populate('groups')
			.lean();
		const group = user.groups.find(group => group._id.toString() === groupId);
		return !!group;
	}

	async joinGroup(userId: string, groupId: string) {
		return await this.userModel.findByIdAndUpdate(userId, { $addToSet: { groups: groupId } }, { new: true });
	}

	async leaveGroup(userId: string, groupId: string) {
		return await this.userModel.findByIdAndUpdate
			(userId, { $pull: { groups: groupId } }, { new: true });
	}

	async findById(userId: string) {
		const user = await this.userModel.findById(userId);
		if (!user) {
			throw new Error('User not found');
		}
		user.password = undefined;
		return user;
	}

	async findMyGroup(userId: string) {
		const myInfo = await this.userModel.findById(userId).populate({
			'path': 'groups', model: GroupModel.name
		});
		return myInfo.groups;
	}
	async changePassword(userId: string, data: ChangePasswordDto) {
		const user = await this.userModel.findById(userId);
		if (!user) {
			throw new BadRequestException('User not found');
		}
		if (user.password !== hashPassword(data.oldPassword)) {
			throw new BadRequestException('Old password is not correct');
		}
		user.password = await hashPassword(data.newPassword);
		await user.save();
		return user;
	}
}
