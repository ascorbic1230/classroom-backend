import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from './schemas/user.schema';
import { JwtService } from "@nestjs/jwt";

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
		const payload = { email: user.email, displayName: user.displayName };
		return this.jwtService.sign(payload);
	}
}
