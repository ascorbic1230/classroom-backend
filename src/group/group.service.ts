import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { get } from 'lodash';
import { GroupModel, GroupDocument } from './schemas/group.schema';
import { sanitizePageSize } from "@/utils";
@Injectable()
export class GroupService {

	constructor(@InjectModel(GroupModel.name) private readonly groupModel: Model<GroupDocument>) { }

	async findAll(query: any): Promise<any> {
		const _size = Number(get(query, 'size', 10));
		const _page = Number(get(query, 'page', 1));
		const { limit, skip } = sanitizePageSize(_page, _size);
		const { size, page, ...remain } = query;
		const _query = {};
		Object.keys(remain).forEach(key => {
			const _value = get(query, key, '');
			if (_value) _query[key] = {
				$regex: _value,
				$options: 'i'
			}
		});
		const [total, data] = await Promise.all([
			this.groupModel.count(_query),
			this.groupModel.find(_query).limit(limit).skip(skip).sort({ createdAt: -1 }).lean(),
		]);
		return {
			data,
			meta: {
				currentPage: +_page,
				pageSize: +_size,
				totalPages: Math.ceil(total / _size),
				totalRows: total,
			},
		};
	}
}