import {
	Injectable,
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as redis from 'redis';

@Injectable()
export class RedisService
	implements OnApplicationShutdown, OnApplicationBootstrap {
	private client: any;

	private readonly logger = new Logger(RedisService.name);

	constructor(private readonly configService: ConfigService) { }

	async onApplicationBootstrap() {
		await this.connect();
	}

	async onApplicationShutdown() {
		await this.disconnect();
	}

	async connect() {
		const host = this.configService.get('REDIS_HOST');
		const port = this.configService.get('REDIS_PORT');
		const username = this.configService.get('REDIS_USERNAME');
		const password = this.configService.get('REDIS_PASSWORD');
		const client = redis.createClient({
			url: `redis://${username}:${password}@${host}:${port}`,
			socket: {
				tls: true
			},
		});

		client.connect();

		client.on('connect', () => {
			this.logger.log('Redis is connecting');
		});

		client.on('ready', () => {
			this.logger.log('Redis is ready');
		});

		client.on('error', (error) => {
			this.logger.error(error.message);
		});

		this.client = client;
	}

	async disconnect() {
		if (this.client && this.client.connected) {
			await this.client.quit();
		}
	}

	get(key: string) {
		return this.client.get(key);
	}

	set(key: string, value: unknown) {
		return this.client.set(key, value);
	}

	setEx(key: string, value: unknown) {
		return this.client.set(key, value, 'EX', 60 * 60 * 24); //1d
	}

	async getJson(key: string) {
		return JSON.parse(await this.client.get(key));
	}

	push(key: string, value: unknown) {
		return this.client.lPush(key, value);
	}

	getListJson(key: string) {
		return this.client.lRange(key, 0, -1).then((list: string[]) => {
			return list.map((item) => JSON.parse(item));
		});
	}
}
