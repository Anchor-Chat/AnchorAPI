import { AnchorAPI } from "./AnchorAPI";
import Server from "./Server";
import sha256 from "crypto-js/sha256";
import Base64 from "crypto-js/enc-base64";
import AES from "crypto-js/aes";
import CryptoJS from "crypto-js";
import IPFS = require("ipfs");
import OrbitDB from "orbit-db"
import Keystore from "orbit-db-keystore";
import { EventStore } from "orbit-db-eventstore";
import { AnchorAuthError } from "./exceptions/AnchorAuthError";
import rimraf from "rimraf";
import uuid from "uuid/v4"

/// <reference path="../node_modules/@types/node/index.d.ts" />
import path from "path";

const USER_LOG_ADDRESS = "/orbitdb/QmURvEErXCPnDB9ERPHRNHsChp44TGNNKnv8euRqa5n7Vz/Anchor-Chat/userLog";

export class AnchorAPIBuilder {

    ipfs: IPFS;

    private cypher: string;
    private _login: string;

    setIPFS(ipfs: IPFS): AnchorAPIBuilder {
        this.ipfs = ipfs;
        console.log("set ipfs");
        return this;
    }

    setLoginAndPassword(login: string, password: string): AnchorAPIBuilder {
        this.cypher = Base64.stringify(sha256(login +":"+ password));
        this._login = login;
        console.log("set login and pass");

        return this;
    }

    createAccount(): Promise<AnchorAPI> {
        return new Promise(async (resolve) => {
            console.log("createAccount");

            let orbitdb = new OrbitDB(this.ipfs);
            console.log("orbitdb create");

            let userLog = await orbitdb.open(USER_LOG_ADDRESS, {type:"eventstore"}) as EventStore;
            console.log("userlog create");

            await userLog.load();

            console.log("UserLog loaded");

            let userDB = await orbitdb.kvstore("Anchor-Chat/"+uuid());
            await userDB.load();

            console.log("DBs loaded");

            let key = {
                public: orbitdb.key.getPublic('hex').toString(),
                private: AES.encrypt(orbitdb.key.getPrivate('hex').toString(), this.cypher).toString()
            }

            await userDB.set("name", this._login);
            await userDB.set("key", key);
            await userDB.set("servers", []);

            await userLog.add({ name: this._login, address: userDB.address });

            console.log("Creating AnchorAPI");

            new AnchorAPI({
                orbitdb,
                ipfs: this.ipfs
            }, anchor => {
                console.log("Resolve promise");
                resolve(anchor);
            });
        });
    }

    login(): Promise<AnchorAPI> {        
        return new Promise(async (resolve) => {
            let orbitdb = new OrbitDB(this.ipfs);

            let userLog = await orbitdb.log(USER_LOG_ADDRESS);
            await userLog.load();

            let userLogEntry: any = userLog
                .iterator()
                .map(e => e.payload.value)
                .filter(e => e.name.match(this._login))
                .values()[0] || null;

            if (userLogEntry) {
                let userDB = await orbitdb.kvstore(userLogEntry.address);
                await userDB.load();

                let key = userDB.get("key");

                if (!orbitdb.key.getPublic('hex').toString().match(key.public)) {
                    key.private = AES.decrypt(key.private, this.cypher).toString(CryptoJS.enc.Utf8);

                    if (key.private.length > 0) {
                        
                        let dir = orbitdb.directory;
                        let keystoreDir = path.join(dir, "/keystore");
                        await orbitdb.stop();

                        rimraf.sync(keystoreDir);

                        let keystore = Keystore.create(keystoreDir);
                        keystore.importPublicKey(key.public);
                        keystore.importPrivateKey(key.private);

                        orbitdb = new OrbitDB(this.ipfs, dir, {
                            keystore
                        });

                    } else {
                        throw new AnchorAuthError("The password is incorrect!");
                    }
                }

                new AnchorAPI({
                    orbitdb,
                    ipfs: this.ipfs
                }, anchor => {
                    resolve(anchor);
                });

            } else {
                throw new AnchorAuthError("A user with this login doesn't exist!");
            }
        });
    }
    
}

export default AnchorAPIBuilder;