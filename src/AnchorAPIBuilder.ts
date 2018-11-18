import { AnchorAPI } from "./AnchorAPI";
import { UserLogEntry } from "./object/UserLogEntry";
import { Server } from "./object/Server";
import sha256 from "crypto-js/sha256";
import Base64 from "crypto-js/enc-base64";
import AES from "crypto-js/aes";
import CryptoJS from "crypto-js";
import * as IPFS from "ipfs";
import OrbitDB from "orbit-db"
import Keystore from "orbit-db-keystore";
import { EventStore } from "orbit-db-eventstore";
import { AnchorAuthError } from "./exceptions/AnchorAuthError";
import uuid from "uuid/v4"

/// <reference path="../node_modules/@types/node/index.d.ts" />
import path from "path";

const USER_LOG_NAME = "Anchor-Chat/userLog";
const USER_LOG_ADDRESS = "/orbitdb/QmURvEErXCPnDB9ERPHRNHsChp44TGNNKnv8euRqa5n7Vz/" + USER_LOG_NAME;

/**
 * Used to create a new [[AnchorAPI]] instance
 */
export class AnchorAPIBuilder {

    private ipfs: IPFS = null;

    private ipfsOpts;
    private cypher: string;
    private _login: string;
    private directory: string;

    constructor() {
        this.setDirectory(process.cwd());
    }

    /**
     * Sets the directory where all data will be stored (.oribtdb and .jsipfs)
     */
    setDirectory(directory: string): AnchorAPIBuilder {
        this.directory = directory;
        return this;
    }

    /**
     * !!!UNRECOMMENDED!!!<br>
     * Use this if you have your own ipfs instance ready.
     * Make sure it has EXPERIMENTAL.pubsub = true in the config.
     * If you only need to change config of the ipfs node see [[setIPFSConfig]]
     */
    setIPFS(ipfs: IPFS): AnchorAPIBuilder {
        this.ipfs = ipfs;
        return this;
    }

    /**
     * Sets the login and password.
     */
    setLoginAndPassword(login: string, password: string): AnchorAPIBuilder {
        this.cypher = Base64.stringify(sha256(login + ":" + password));
        this._login = login;

        return this;
    }

    /**
     * Sets the config of a ipfs node that's about to be created.
     * Unused if [[setIPFS]] is called.
     */
    setIPFSConfig(opts): AnchorAPIBuilder {
        this.ipfsOpts = opts;

        return this;
    }

    /**
     * !!!IMPORTANT!!!
     * Internal use only
     */
    private _setDefaults() {
        return new Promise((resolve, reject) => {
            if (this.ipfs === null) {
                this.setIPFS(new IPFS.default(Object.assign({
                    EXPERIMENTAL: {
                        pubsub: true
                    },
                    repo: path.join(this.directory, ".jsipfs")
                }, this.ipfsOpts)));
            }

            this.ipfs.on("error", (err) => {
                return reject(err);
            });

            if (!this.ipfs.isOnline()) {
                this.ipfs.on("ready", () => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Creates a new account with credentials set in [[setLoginAndPassword]]
     */
    async createAccount(): Promise<AnchorAPI> {
        await this._setDefaults();

        let orbitdb = new OrbitDB(this.ipfs, path.join(this.directory, ".orbitdb"));

        let userLog = await orbitdb.log<UserLogEntry>(USER_LOG_NAME, { write: ["*"] });
        await userLog.load();

        //console.log(userLog.address);

        let u = userLog
            .iterator({ limit: -1 })
            .collect()
            .map(e => e.payload.value)
            .filter(e => e.login === this._login)[0] || null;

        if (u) {
            return await this.login(orbitdb, userLog);
        }

        let userDB = await orbitdb.kvstore("Anchor-Chat/" + this._login);
        await userDB.load();

        let key = {
            public: orbitdb.key.getPublic('hex').toString(),
            private: AES.encrypt(orbitdb.key.getPrivate('hex').toString(), this.cypher).toString()
        }

        await userDB.set("name", this._login);
        await userDB.set("key", key);
        await userDB.set("servers", []);
        await userDB.set("privateTextChannels", {});

        await userLog.add(new UserLogEntry(this._login, userDB.address.toString()));

        return await AnchorAPI.create(this.ipfs, orbitdb, userDB, userLog, this._login);
    }

    /**
     * Logs in to a account with credentials set in [[setLoginAndPassword]].
     */
    login(orbitdb?: OrbitDB, userLog?: EventStore<UserLogEntry>): Promise<AnchorAPI> {
        return new Promise<AnchorAPI>(async (resolve, reject) => {
            await this._setDefaults();

            orbitdb = orbitdb || new OrbitDB(this.ipfs, path.join(this.directory, ".orbitdb"));

            userLog = userLog || await orbitdb.log<UserLogEntry>(USER_LOG_ADDRESS, { write: ["*"] });
            await userLog.load();

            userLog.events.once("replicated", async () => {
                let userLogEntry = userLog
                    .iterator({ limit: -1 })
                    .collect()
                    .map(e => e.payload.value)
                    .filter(e => e.login === this._login)[0] || null;

                if (userLogEntry) {
                    let userDB = await orbitdb.kvstore<any>(userLogEntry.address);
                    await userDB.load();

                    let key = userDB.get("key");

                    if (!orbitdb.key.getPublic('hex').toString().match(key.public)) {
                        key.private = AES.decrypt(key.private, this.cypher).toString(CryptoJS.enc.Utf8);

                        if (key.private.length > 0) {

                            let dir = orbitdb.directory;
                            let keystoreDir = path.join(dir/*, "/keystore"*/);
                            await orbitdb.stop();

                            let keystore = Keystore.create(keystoreDir);
                            keystore.importPublicKey(key.public);
                            keystore.importPrivateKey(key.private);

                            orbitdb = new OrbitDB(this.ipfs, dir, {
                                keystore
                            });

                            userDB = await orbitdb.kvstore(userLogEntry.address);
                            await userDB.load();

                        } else {
                            return reject(new AnchorAuthError("The password is incorrect!"));
                        }
                    }

                    return resolve(await AnchorAPI.create(this.ipfs, orbitdb, userDB, userLog, this._login));

                } else {
                    return reject(new AnchorAuthError("A user with this login doesn't exist!"));
                }
            });
        });
    }

}