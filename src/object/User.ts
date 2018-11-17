import { KeyValueStore } from "orbit-db-kvstore";
import AnchorAPI from "../AnchorAPI";
import Server from "./Server";
import UserLogEntry from "./UserLogEntry";

export class User {
    
    api: AnchorAPI;

    db: KeyValueStore<any>

    name: string;
    login: string;
    key: { public: string, private: string }
    servers: Server[];

    isLocalUser(): boolean {
        return this.api.thisUser === this;
    }

    private async _init(api: AnchorAPI, userDb: KeyValueStore<any>) {
        this.db = userDb;
        this.api = api;

        this.name = userDb.get("name");
        this.servers = await api._getServerData(this.db.get("servers") || []);
        this.db.events.prependListener("replicated", () => {
            this.name = this.db.get("name");
            api._getServerData(this.db.get("servers") || []).then((servers) => {
                this.servers = servers;
            });
            this.key = this.db.get("key");
        });
    }

    static async create(api: AnchorAPI, userDb: KeyValueStore<any>): Promise<User> {
        let o = new User();
        await o._init(api, userDb);
        return o;
    }

    toEntry() {
        return new UserLogEntry(this.login, this.db.address.toString());
    }

    toJSON() {
        return this.toEntry();
    }
}

export default User;