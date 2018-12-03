import { EventEmitter } from "events";
import { FeedStore } from "orbit-db-feedstore";
import { Message } from "./Message";
import { User } from "./User";
import { AnchorAPI } from "../AnchorAPI";
import { KeyValueStore } from "orbit-db-kvstore";
import { UserEntry } from "./UserEntry";
import { AnchorError } from "../exceptions/AnchorError";

function fastConcat(arr1: any[], arr2: any[]) {
	Array.prototype.push.apply(arr1, arr2);
}

/**
 * A text channel
 */
export class TextChannel extends EventEmitter {

	/** An [[AnchorAPI]] instance */
	api: AnchorAPI;

	name: string;

	/** Users that are a part of this [[TextChannel]] */
	users: User[] = [];

	/** This [[TextChannel]]'s db */
	db: KeyValueStore<any>;

	/** [[Message]]s that were sent in this [[TextChannel]] */
	messages: Message[] = [];

	static async create(api: AnchorAPI, db: string | KeyValueStore<any>, users?: User[], name?: string) {
		let channel = new TextChannel();

		channel.api = api;
		channel.db = typeof db === "string" ? await api.orbitdb.kvstore(db) : typeof (<KeyValueStore<any>>db).set === "function" ? db : undefined;
		await channel.db.load();

		if (channel.db === undefined) {
			throw new AnchorError("Error: Invalid db pointer! Must be a string or a KeyValueStore!");
		}

		if (channel.db.get("name") == null) {
			channel.db.set("name", name || channel.id);
			channel.db.set("users", users.map(e => e.toEntry()));
			channel.db.set("messages", []);
		}
		channel._getDataFromDB();
		channel.db.events.on("replicated", channel._getDataFromDB.bind(channel));


		return channel;
	}

	/** The id of the channel */
	get id() {
		let str = this.db.address.toString();
		return str.slice(str.lastIndexOf("/") + 1);
	}

	/** Allows you to filter thru the messages array */
	getMessageHistory(options?: { limit: number, reverse: boolean }): Message[] {
		let messages = this.messages;
		if (options !== undefined) {
			if (options.limit > 0) {
				messages = messages.slice(0, options.limit);
			}
			if (options.reverse) {
				messages = messages.reverse();
			}
		}

		return messages;
	}

	/** Sends a message */
	async sendMessage(text: string) {
		let msg = new MessageEntry(this.api.thisUser.toEntry(), text);

		let msgs = this.db.get("messages") || [];
		msgs.push(msg);
		await this.db.set("messages", msgs);
	}

    /** 
     * Closes this [[TextChannel]] once you are done with it.
     * But keep in mind that this text channel will remain 
     * in the system and text time you open it all the messages will be there
    */
	async close() {
		await this.db.close();
		return;
	}

	private _getDataFromDB() {
		this.name = this.db.get("name");
		this.users = [];

		let userData = this.db.get("users") as UserEntry[];
		userData.forEach(async (e) => {
			this.users.push(await this.api.getUserData(e.login));
		})
		
		let msgData = this.db.get("messages") as MessageEntry[];

		msgData = msgData.slice(this.messages.length - 1);

		this.messages = [];
		msgData.forEach(async (data) => {
			let msg = new Message(await this.api.getUserData(data.author.login), data.text);

			this.messages.push(msg);

			this.emit("message", msg);
		})
	}
}

/**
 * A tiny class that reperesents a single entry in this [[TextChannel]]'s db's messages array
 */
class MessageEntry {
	author: UserEntry;
	text: string;

	no: number;

	constructor(author: UserEntry, text: string) {
		this.author = author;
		this.text = text;
	}
}

export default TextChannel;