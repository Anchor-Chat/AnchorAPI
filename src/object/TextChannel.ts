import { EventEmitter } from "events";
import { FeedStore } from "orbit-db-feedstore";
import Message from "./Message";
import User from "./User";
import AnchorAPI from "../AnchorAPI";
import { KeyValueStore } from "orbit-db-kvstore";
import UserLogEntry from "./UserLogEntry";
import AnchorError from "../exceptions/AnchorError";

function fastConcat(arr1: any[], arr2: any[]) {
    Array.prototype.push.apply(arr1, arr2);
}

export class TextChannel extends EventEmitter {

    api: AnchorAPI;

    id: string;
    name: string;
    users: User[] = [];

    db: KeyValueStore<any>;

    messages: Message[] = [];

    static async create(api: AnchorAPI, db: string | KeyValueStore<any>, id: string) {
        let channel = new TextChannel();

        channel.id = id;
        channel.api = api;
        channel.db = typeof db === "string" ? await api.orbitdb.kvstore(db) :  typeof (<KeyValueStore<any>>db).set === "function" ? db : undefined;
        await channel.db.load();

        if (channel.db === undefined) {
            throw new AnchorError("Error: Invalid db pointer! Must be a string or a KeyValueStore!");
        }

        channel._getDataFromDB();
        channel.db.events.on("replicated", channel._getDataFromDB.bind(channel));

        channel.db.set("messages", []);

        return channel;
    }

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

    async sendMessage(text: string) {
        let msg = new MessageEntry(this.api.thisUser.toEntry(), text);

        let msgs = this.db.get("messages") || [];
        msgs.push(msg);
        await this.db.set("messages", msgs);
    }

    async close() {
        await this.db.close();
        return;
    }

    private _getDataFromDB() {
        this.name = this.db.get("name");

        let msgData = (this.db.get("messages") || []) as MessageEntry[];

        msgData = msgData.slice(this.messages.length-1);

        this.messages = [];
        msgData.forEach(async (data) => {
            let msg = new Message(await this.api._getUserData(data.author.login), data.text);

            this.messages.push(msg);

            this.emit("message", msg);
        })
    }
}

class MessageEntry {
    author: UserLogEntry;
    text: string;

    no: number;

    constructor(author: UserLogEntry, text: string) {
        this.author = author;
        this.text   = text;
    }
}

export default TextChannel;