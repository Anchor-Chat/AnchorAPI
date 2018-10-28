import uuidv4 from "uuid/v4"
import Server from "./object/Server";
import { AnchorAPI } from "./AnchorAPI";

export class ServerBuilder {
    
    name: string;

    api: AnchorAPI

    constructor(api: AnchorAPI) {
        this.api = api;
    }

    setName(name: string): ServerBuilder {
        this.name = name;
        return this;
    }

    /**
     * Builds the instance and "publishes" it
     */
    create(): Promise<Server> {
        let uuid = uuidv4();

        return new Promise((resolve, reject) => {
            new Server(this.api, uuid, s => {
                let srvrs: string[] = this.api.thisUser.db.get("servers");
                
                srvrs.push(s.db.address.toString());
                this.api.thisUser.db.set("servers", srvrs);
    
                resolve(s);
            });
        });
    }
}

export default ServerBuilder;