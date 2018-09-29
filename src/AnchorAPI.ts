import OrbitDB from "orbit-db"
import IPFS = require("ipfs");
import Server from "./Server";
import { KeyValueStore } from "orbit-db-kvstore";
import { ServerBuilder } from "./ServerBuilder";

export class AnchorAPI {

    ipfs: IPFS;
    userToken: string;
    orbitdb: OrbitDB;
    db: KeyValueStore;

    private servers: Server[];

    constructor(o: any, callback?: (anchorApi: AnchorAPI) => void) {
        Object.assign(this, o);

        if (typeof(this.ipfs) === "undefined") {

        }

        this.orbitdb = this.orbitdb || new OrbitDB(this.ipfs);

        this.orbitdb.kvstore(this.userToken).then(db => {
            db.load().then(async () => {
                this.db = db;

                if (!this.db.get("servers")) {
                    await this.db.set("servers", []);
                }

                if (callback) callback(this);

                //setTimeout(() => {
                    setInterval(() => {this.getServerData()}, 1000)
                //}, 100)
            });
        });
        
    }

    getServers(): Server[] {
        return this.servers;
    }

    getServersByName(name: string): Server[] {
        return this.getServers().filter(s => {s.name.match(name)});
    }

    getServersByNameIgnoreCase(name: string): Server[] {
        return this.getServers().filter(s => {s.name.toLowerCase().match(name.toLowerCase())});
    }

    createServerBuilder(): ServerBuilder {
        return new ServerBuilder(this);
    }

    close(): Promise<void> {
        return this.orbitdb.stop();
    }

    private getServerData() {
        let serverAddresses: string[] = this.db.get("servers");

        serverAddresses.forEach(s => {
            let tmp = this.servers.filter(e => {e.db.address.toString().match(s)});
            if (tmp.length == 0) {
                new Server(this, s, s => {
                    this.servers.push(s);
                });                
            }
        });
    }
}

export default AnchorAPI;