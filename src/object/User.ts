import { KeyValueStore } from "orbit-db-kvstore";
import { AnchorAPI } from "../AnchorAPI";
import { Server } from "./Server";
import { UserEntry } from "./UserEntry";
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

    /**
     * !!!IMPORTANT!!!
     * Internal use only 
     */
    static async create(api: AnchorAPI, userDb: KeyValueStore<any>): Promise<User> {
        let o = new User();

        o.db = userDb;
        o.api = api;

        o.name = userDb.get("name");
        o.servers = await api._getServerData(o.db.get("servers") || []);

        eventEmitter(o.db.events).prependListener("replicated", () => {
            o.name = o.db.get("name");
            api._getServerData(o.db.get("servers") || []).then((servers) => {
                o.servers = servers;
            });
            o.key = o.db.get("key");
        });

        return o;
    }

    toEntry() {
        return new UserEntry(this.login, this.db.address.toString());
    }

    toJSON() {
        return JSON.stringify(this.toEntry());
    }
}