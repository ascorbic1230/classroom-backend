import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateAccountDto {
	@IsString()
	@IsOptional()
	name: string;

	@IsString()
	@IsOptional()
	avatarUrl: string;

	@IsString()
	@IsOptional()
	description: string;
}