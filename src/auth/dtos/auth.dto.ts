import { IsString, IsNotEmpty, IsEmail, IsEnum, IsNotIn, IsMongoId, Matches, MaxLength, Validate, IsOptional } from 'class-validator';

export class LoginDto {
	@IsString()
	@IsOptional()
	name: string;

	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(20)
	// @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
	// 	message: 'Password must contain at least 8 characters, including UPPER/lowercase and numbers',
	// })
	password: string;
}

export class ChangePasswordDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	oldPassword: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	newPassword: string;
}