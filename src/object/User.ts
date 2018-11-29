import { KeyValueStore } from "orbit-db-kvstore";
import { AnchorAPI } from "../AnchorAPI";
import { Server } from "./Server";
import { UserLogEntry } from "./UserLogEntry";
import { eventEmitter } from "../polyfills"

/**
 * A class representing a user
 */
export class User {
    
    /** An [[AnchorAPI]] instance */
    api: AnchorAPI;

    /** This user's db */
    db: KeyValueStore<any>

    name: string;
    login: string;

    /** 
     * This users public and private key.
     * The private key will be encrypted.
     */
    key: { public: string, private: string }
    servers: Server[];

    /** Is this the local user? */
    isLocalUser(): boolean {
        return this.api.thisUser === this;
    }

    private async _init(api: AnchorAPI, userDb: KeyValueStore<any>) {
        this.db = userDb;
        this.api = api;

        this.name = userDb.get("name");
        this.servers = await api._getServerData(this.db.get("servers") || []);

        eventEmitter(this.db.events);
        this.db.events.prependListener("replicated", () => {
            this.name = this.db.get("name");
            api._getServerData(this.db.get("servers") || []).then((servers) => {
                this.servers = servers;
            });
            this.key = this.db.get("key");
        });
    }

    /**
     * !!!IMPORTANT!!!
     * Internal use only 
     */
    static async create(api: AnchorAPI, userDb: KeyValueStore<any>): Promise<User> {
        let o = new User();
        await o._init(api, userDb);
        return o;
    }

    toEntry() {
        return new UserLogEntry(this.login, this.db.address.toString());
    }

    toJSON() {
        return JSON.stringify(this.toEntry());
    }
}