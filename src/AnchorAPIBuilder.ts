import { AnchorAPI } from "./AnchorAPI";
import Server from "./Server";
import sha256 from "crypto-js/sha256";
import Base64 from "crypto-js/enc-base64";
import AES from "crypto-js/aes";
import IPFS = require("ipfs");
import OrbitDB from "orbit-db"

export class AnchorAPIBuilder {

    ipfs: IPFS;

    private cypher: string;

    setIPFS(ipfs: IPFS) {
        this.ipfs = ipfs;
    }

    setLoginAndPassword(login: string, password: string): AnchorAPIBuilder {
        this.cypher = Base64.stringify(sha256(login +":"+ password));

        return this;
    }


    login(): Promise<AnchorAPI> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.create());
            } catch (e) {
                reject(e);
            }
        });
    }

    private create(): AnchorAPI {
        let settings = {
            ipfs: this.ipfs
        }
        
        let orbit = new OrbitDB(this.ipfs);

        orbit.open("/orbitdb/QmaX9P6RgFGCv6xbtpM3khQiwvRx816LSe1AjbJYrrZP3F/Anchor-Chat/userLog", { type: "eventlog" });

    }
    
}

export default AnchorAPIBuilder;