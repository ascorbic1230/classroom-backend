import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from './schemas/user.schema';
import { JwtService } from "@nestjs/jwt";
import { GroupModel } from "@/group/schemas/group.schema";

@Injectable()
export class UserService {
	constructor(
		@InjectModel(UserModel.name)
		private userModel: Model<UserDocument>,
		private jwtService: JwtService,
	) { }

	findAll(filter) {
		return this.userModel.find(filter, { password: 0 });
	}

	findByEmail(email: string) {
		return this.userModel.findOne({ email });
	}

	create(dto: any) {
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

	joinGroup(userId: string, groupId: string) {
		return this.userModel.findByIdAndUpdate
			(userId, { $addToSet: { groups: groupId } }, { new: true });
	}

	findById(userId: string) {
		return this.userModel.findById(userId).populate({
			'path': 'groups', model: GroupModel.name
		});
	}
}
