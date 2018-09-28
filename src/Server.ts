import { KeyValueStore } from "orbit-db-kvstore";
import AnchorAPI from "./AnchorAPI";

export default class Server {
    name: string;

    db: KeyValueStore;

    constructor(api: AnchorAPI, address: string, callback: (anchorApi: Server) => void) {
        console.log("y");
        api.orbitdb.kvstore(address).then(async (db) => {
            this.db = db;

            await db.load();

            db.events.on("replicated", () => {
                this.name = db.get("name");
            });

            callback(this);
        });

      
    }
}