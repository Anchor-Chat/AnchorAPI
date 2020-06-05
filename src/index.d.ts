import EventEmitter from "eventemitter3";
import IPFS from "ipfs";
import OrbitDB from "orbit-db";

declare module "@anchor-chat/anchor-api" {

	export class AnchorAPIBuilder {

		ipfs: IPFS;
		ipfsOpts: any;
		orbitdb: OrbitDB;

		_login: string;
		password: string;

		directory: string;

		constructor();

		setDirectory(directory: string): AnchorAPIBuilder;
		setIPFS(ipfs: IPFS): AnchorAPIBuilder;
		setCredentials(login: string, password: string): AnchorAPIBuilder;
		setIPFSConfig(opts: any): AnchorAPIBuilder;

		private _setDefaults(opts: any): Promise<AnchorAPIBuilder>;

		createAccount(): Promise<AnchorAPI>;
		login(): Promise<AnchorAPI>;
	}

	export class AnchorAPI extends EventEmitter {
		userProfile: UserProfile;
		user: User;

		ipfs: IPFS;
		orbitdb: OrbitDB;
		userLog: any;

		dmHelper: DMHelper;

		publicKey: string;
		privateKey: string;

		users: Map<string, User>;

		private constructor(userProfile: UserProfile, orbitdb: OrbitDB, ipfs: IPFS, userLog);

		private static create(userProfile: UserProfile, orbitdb: OrbitDB, ipfs: IPFS, userLog): AnchorAPI;

		getUsers(): User[];
		getUsersByName(): User[];
		getUserByLogin(login: string): User;
		getUserData(): Promise<User>;

		getDMChannels(): Promise<DMChannel[]>;

		close(): Promise<void>;
	}

	class UserProfile {
		login: string;
		db: any;
		key: Buffer;

		keys(): string[];
		values(): any[];

		getField(key: string): any;
		setField(key: string, value: any, isPrivate?: boolean): Promise<void>;

		private reEncrypt(newKey: Buffer): Promise<void>;

		verifyPass(): boolean;

		getEntry(): { login: string, address: string };
	}

	class User {
		login: string;
		username: string;

		private constructor(userProfile: UserProfile, api: AnchorAPI);

		createDM(): Promise<DMChannel>;
		deleteDM(): Promise<void>;
	}

	class ChannelData {
		name: string;

		db: any;

		keys(): string[];
		values(): any[];

		getField(key: string): any;
		setField(key: string, value: any, isPrivate?: boolean): Promise<void>;
	}

	class Channel {
		createdAt: number;
		type: string;
		deleted: boolean;
		id: string;

		constructor(channelData: ChannelData, api: AnchorAPI);

		private static init(channelData: ChannelData, type: string, id: string): Promise<ChannelData>;

		delete(): Promise<void>;
	}

	interface MessageOptions {

	}

	interface MessageData {
		content: string;
		signature: string;

		author: string;
		options: MessageOptions;

		id: string;
	}

	class Message {
		content: string;
		signature: string;
		verified: boolean;

		author: User;
		channel: TextChannel;

		id: string;
	}

	class MessagesData {
		db: any;
		channel: TextChannel;
		api: AnchorAPI;

		constructor(channel: TextChannel, api: AnchorAPI);

		addMessage(content: string, options?: MessageOptions, data?: any): Promise<string>;

		fetchMessage(id: string, options: { limit?: number, reverse?: boolean }): Promise<Message>;
		fetchMessages(options?: { limit?: number, reverse?: boolean }): Promise<Message[]>;
	}

	export class TextChannel extends Channel {
		messages: MessagesData;

		private _entryIntoMsg(data: MessageData, _, __, altVerif: string): Promise<Message>;

		send(content: string, options?: MessageOptions, data?: any): Promise<string>;
	}

	class DMChannel extends TextChannel {
		members: User[];

		key: Buffer;
	}

	interface DMChannelEntry {
		members: string[];
		addres: string;
	}

	class DMHelper {
		db: any;
		orbitdb: OrbitDB;
		api: AnchorAPI;

		channels: Map<string, DMChannel>;

		constructor(db: any, orbitdb: OrbitDB, api: AnchorAPI);

		static create(orbitdb: OrbitDB, api: AnchorAPI): Promise<DMHelper>;

		getChannelFor(user: User): Promise<DMChannel>;
		getGroupChannelFor(members: User[]): Promise<DMChannel>;
		newDMChannel(members: User[]): Promise<DMChannel>;

		private entryToChannel(channelEntry: DMChannelEntry): Promise<DMChannel>;

		getChannels(): Promise<DMChannel[]>;
	}
}