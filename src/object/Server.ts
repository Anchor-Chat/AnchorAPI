import { KeyValueStore } from "orbit-db-kvstore";
import AnchorAPI from "../AnchorAPI";

export default class Server {
    name: string;

    db: KeyValueStore<any>;

    constructor(api: AnchorAPI, address: string, callback: (anchorApi: Server) => void) {
        api.orbitdb.kvstore<any>(address).then(async (db) => {
            this.db = db;

            await db.load();

            db.events.on("replicated", () => {
                this.name = db.get("name");
            });

            callback(this);
        });
    }

    async destroy() {
        await this.db.close();
    }

}