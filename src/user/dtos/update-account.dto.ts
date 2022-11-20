import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateAccountDto {
	@IsString()
	@IsOptional()
	name: string;

	@IsEmail()
	@IsOptional()
	email: string;

	@IsString()
	@IsOptional()
	avatarUrl: string;

	@IsString()
	@IsOptional()
	description: string;
}