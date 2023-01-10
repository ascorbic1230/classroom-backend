import { HttpException } from "@nestjs/common";
import * as crypto from 'crypto';


export const sha256 = (input: string) => {
	return crypto.createHash('sha256').update(input).digest('hex');
};

export const md5 = (input: string) => {
	return crypto.createHash('md5').update(input).digest('hex');
};

export const getBearerToken = (header: string) => {
	return typeof header === 'string'
		? header.replace(/^Bearer /, '').trim()
		: '';
};

// TODO: change hash method
export const hashPassword = (input: string) => {
	return md5(input);
};

export const validatePassword = (input: string, hash: string) => {
	return hashPassword(input) === hash;
};

export const sanitizePageSize = function (page: number, size: number) {
	if (page < 1 || size < 0) throw new HttpException('error page size', 400);
	const limit = size || 10;
	const skip = (page - 1) * size;

	return {
		limit,
		skip,
	};
};

export const generateRandom8Digits = () => {
	return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export const generateRandomString = () => {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}