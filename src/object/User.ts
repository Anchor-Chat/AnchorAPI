import { KeyValueStore } from "orbit-db-kvstore";
import AnchorAPI from "../AnchorAPI";
import Server from "./Server";
import UserLogEntry from "./UserLogEntry";

export class User {
    
    api: AnchorAPI;

    db: KeyValueStore<string, any>

    name: string;
    login: string;
    servers: Server[];

    isLocalUser(): boolean {
        return this.api.thisUser === this;
    }

    private async _init(api: AnchorAPI, userDb: KeyValueStore<string, any>) {
        this.db = userDb;
        this.api = api;

        this.name = userDb.get("name");
        this.servers = await api._getServerData(this.db.get("servers"));
        userDb.events.on("replicated", async () => {
            this.name = userDb.get("name");
            this.servers = await api._getServerData(this.db.get("servers"));
        });
    }

    static async create(api: AnchorAPI, userDb: KeyValueStore<string, any>): Promise<User> {
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