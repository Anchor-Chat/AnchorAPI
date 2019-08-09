import EventEmitter from "eventemitter3";
import IPFS from "ipfs";
import OrbitDB from "orbit-db";

declare module "@anchor-chat/anchor-api" {

	export class AnchorAPIBuilder {

		ipfs: IPFS;
		ipfsOpts: any;
		orbitdb: OrbitDB;

		login: string;
		password: string;

		directory: string; 

		constructor();

		setDirectory(directory: string): AnchorAPIBuilder;
		setIPFS(ipfs: IPFS): AnchorAPIBuilder;
		setCredentials(login: string, password: string): AnchorAPIBuilder;
		setIPFSConfig(opts: any): AnchorAPIBuilder;

		private async _setDefaults(opts: any): AnchorAPIBuilder;

		async createAccount(): Promise<AnchorAPI>;
		async login(): Promise<AnchorAPI>;
	}

	declare class AnchorAPI extends EventEmitter {

		get user(): User;

		get publicKey(): string;

		userProfile: UserProfile;

		ipfs: IPFS;
		orbitdb: OrbitDB;
		userLog: any;

		dmHelper: DMHelper;

		privateKey: string;

		users: { [key: string]: User }

		private constructor(userProfile: UserProfile, orbitdb: OrbitDB, ipfs: IPFS, userLog);

		private static create(userProfile: UserProfile, orbitdb: OrbitDB, ipfs: IPFS, userLog): AnchorAPI;

		getUsers(): User[];
		getUsersByName(): User[];
		getUserByLogin(login: string): User;
		async getUserData(): User;

		getDMChannels(): DMChannel[];

		async close(): void;
	}

	declare class UserProfile {
		login: string;
		db: any;
		key: Buffer;

		keys(): string[];
		values(): any[];

		getField(key: string): any;
		async setField(key: string, value: any, isPrivate?: boolean): void;

		private reEncrypt(newKey: Buffer): Promise<void>;

		verifyPass(): boolean;

		getEntry(): { login: string, address: string };
	}

	declare class User {
		get login(): string;
		get username(): string;

		private constructor(userProfile: UserProfile, api: AnchorAPI);

		async createDM(): DMChannel;
		async deleteDM(): void;
	}

	declare class ChannelData {

	}

	declare class Channel {
		get createdAt(): number;
		get type(): string;
		get deleted(): boolean;

		private constructor(channelData: ChannelData, api: AnchorAPI);

		private static async init(channelData, type): ChannelData;

		async delete(): void;
	}

	interface MessageData {

	}

	declare class TextChannel extends Channel {
		getMessages(): Message[];

		private constructor(channelData: ChannelData, api: AnchorAPI);
		private async _entryIntoMsg(data: MessageData, _, __, altVerif: string);

		async send()
	}

	declare class DMChannel extends TextChannel {

	}

	declare class DMHelper {

	}
}