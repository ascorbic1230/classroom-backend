import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from './schemas/user.schema';
import { JwtService } from "@nestjs/jwt";
import { GroupModel } from "@/group/schemas/group.schema";
import { GroupService } from "@/group/group.service";
import { forwardRef } from "@nestjs/common/utils";

@Injectable()
export class UserService {
	constructor(
		@InjectModel(UserModel.name)
		private userModel: Model<UserDocument>,
		private jwtService: JwtService
	) { }

	//Admin Route
	findAll(filter) {
		const result = this.userModel.find(filter, { password: 0 });
		return {
			statusCode: 200,
			data: result,
			message: 'Get all users successfully'
		};
	}

	findByEmail(email: string) {
		//TODO: change return msg
		return this.userModel.findOne({ email });
	}

	create(dto: any) {
		//TODO: change return msg
		return this.userModel.create(dto);
	}

	update(id: string, dto: any) {
		return this.userModel.findByIdAndUpdate(id, dto, { new: true });
	}

	delete(id: string) {
		return this.userModel.findByIdAndDelete(id);
	}

	generateJWT(user: any) {
		const payload = { email: user.email, name: user.name };
		return this.jwtService.sign(payload);
	}

	//should use redis instead
	generateJWTAsVerificationCode(user: any) {
		const payload = { email: user.email, name: user.name, time: Date.now() };
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
		return await this.userModel.findByIdAndUpdate
			(userId, { $addToSet: { groups: groupId } }, { new: true });
		//should change return msg
	}

	async findById(userId: string) {
		const user = await this.userModel.findById(userId);
		if (!user) {
			throw new Error('User not found');
		}
		return {
			statusCode: 200,
			data: user,
			message: 'Get my group successfully'
		};
	}

	async findMyGroup(userId: string) {
		const myInfo = await this.userModel.findById(userId).populate({
			'path': 'groups', model: GroupModel.name
		});
		return {
			statusCode: 200,
			data: myInfo.groups,
			message: 'Get my group successfully'
		};
	}
}
