import { IsString, IsNotEmpty, IsEmail, IsEnum, IsNotIn, IsMongoId, Matches } from 'class-validator';

export class LoginDto {
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsNotEmpty()
	@IsString()
	password: string;
}