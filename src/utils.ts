import { HttpException } from "@nestjs/common";
import ShortUniqueId from "short-unique-id";
import * as crypto from 'crypto';
import * as moment from "moment";
import * as path from "path";

const ShortID12 = new ShortUniqueId({ length: 12 });

export const sha256 = (input: string) => {
	return crypto.createHash('sha256').update(input).digest('hex');
};

export const md5 = (input: string) => {
	return crypto.createHash('md5').update(input).digest('hex');
};

export const generateToken = () => {
	return crypto.randomBytes(32).toString('hex');
};

export const generateUUID = () => {
	return crypto.randomUUID();
};

export const generateUUIDWithMoment = () => {
	const now = moment().unix();
	return `${now}${ShortID12.randomUUID()}`;
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

export const getFileExt = function (filename) {
	const ext = path.extname(filename);
	let normalize = ext;
	if (normalize) {
		normalize = normalize.toLowerCase();
		if ('.jpeg' === normalize) {
			normalize = '.jpg';
		}
	}

	return {
		ext: ext,
		normalize: normalize,
	};
};

export function randomInt(min: number, max: number): number {
	const rand = Math.random() * (max - min);
	return Math.floor(rand + min);
}

export const sanitizePageSize = function (page: number, size: number) {
	if (page < 1 || size < 0) throw new HttpException('error page size', 400);
	const limit = size || 10;
	const skip = (page - 1) * size;

	return {
		limit,
		skip,
	};
};

export const arrayShuffle = (array: any[]) => {
	for (let i = 0, length = array.length, swap = 0, temp = ''; i < length; i++) {
		swap = Math.floor(Math.random() * (i + 1));
		temp = array[swap];
		array[swap] = array[i];
		array[i] = temp;
	}
	return array;
};

export const findRangeOfNumber = (rangeArray: string[], number: number) => {
	for (let i = 0; i < rangeArray.length; i++) {
		if (number <= Number(rangeArray[i])) {
			return rangeArray[i];
		}
	}
	return rangeArray[rangeArray.length - 1];
};

export const generateFileName = (ext: string) => {
	const name = generateUUIDWithMoment();
	return crypto.createHash('md5').update(name).digest('hex') + ext;
	// return name + ext;
};

export const parsePageNum = (v) => {
	if (v === null || v === undefined) {
		return 1;
	}

	if (isNaN(v)) {
		return 1;
	}

	return Math.max(parseInt(v), 1);
};

export const getMimeFromFileName = (filename) => {
	const ext = getExtFromFileName(filename);
	switch (ext) {
		case '.jpg':
			return 'image/jpeg';
		case '.png':
			return 'image/png';
		case '.csv':
			return 'text/csv';
		default:
			return 'application/octet-stream';
	}
};

export const getExtFromFileName = (filename) => {
	let ext = path.extname(filename).toLowerCase();
	if (ext == '.jpeg') ext = '.jpg';
	return ext;
};