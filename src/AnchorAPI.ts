import OrbitDB from "orbit-db"
import IPFS = require("ipfs");
import { Server } from "./object/Server";
import { KeyValueStore } from "orbit-db-kvstore";
import TextChannel from "./object/TextChannel";
import { ServerBuilder } from "./ServerBuilder";
import { UserLogEntry } from "./object/UserLogEntry";
import { EventStore } from "orbit-db-eventstore";
import { User } from "./object/User";
import { AnchorError } from "./exceptions/AnchorError";
import { EventEmitter2 } from "eventemitter2";

/**
 * Main class containing IPFS & OrbiDB instances
 */
export class AnchorAPI extends EventEmitter2 {

    /** IPFS instance */
    ipfs: IPFS;
    /** OrbitDB instance */
    orbitdb: OrbitDB;

    /** The database containing "links" to all users dbs */
    userLog: EventStore<UserLogEntry>;

    /** This user instance */
    thisUser: User;

    private servers: Server[] = [];
    private users: Map<string, User>;

    private constructor(ipfs: IPFS, orbitdb: OrbitDB, userLog: EventStore<UserLogEntry>) {
        super();
        this.ipfs = ipfs;
        this.orbitdb = orbitdb;
        this.userLog = userLog;
        this.users = new Map();
    }

    /**
     * Creates a new AnchorAPI instance.
     * Should never be used.
     * Look at [[AnchorAPIBuilder]] instead
     */
    static async create(ipfs: IPFS, orbitdb: OrbitDB, db: KeyValueStore<any>, userLog: EventStore<UserLogEntry>, login: string): Promise<AnchorAPI> {
        let api = new AnchorAPI(ipfs, orbitdb, userLog);
        api.thisUser = await api.getUserData(login, db);
        
        ipfs.pubsub.subscribe("Anchor-Chat/ping/"+api.thisUser.login, (msg) => {
            msg = msg.data.toString("utf8");

            ipfs.pubsub.publish("Anchor-Chat/pingResp/"+msg, Buffer.from(""));
        });

        ipfs.pubsub.subscribe("Anchor-Chat/addPrivateChannel/"+api.thisUser.login, async (msg) => {
            let textChannels = api.thisUser.db.get("privateTextChannels");

            msg = JSON.parse(msg.data.toString("utf8"));

            textChannels[msg.key] = msg.address;
            await api.thisUser.db.set("privateTextChannels", textChannels);

            api.emit("privateTextChannelOpen", msg.login);
        });

        api.userLog.events.once("replicated", () => api.emit("ready"));

        return api;
    }

    /**
     * "Pings" another user thru PubSub.
     * Allows you to find out if they are online.
     */
    ping(login: string) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(false);
            }, 60000);

            let msgReceive = () => {
                resolve(true);
                this.ipfs.pubsub.unsubscribe("Anchor-Chat/pingResp/"+this.thisUser.login, msgReceive);
            };

            this.ipfs.pubsub.subscribe("Anchor-Chat/pingResp/"+this.thisUser.login, msgReceive, {}, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.ipfs.pubsub.publish("Anchor-Chat/ping/"+login, Buffer.from(this.thisUser.login));
                }
            });
        });
    }

    /**
     * Gets all the Servers this intance knows about
     */
    getServers(): Server[] {
        return this.servers;
    }

    /**
     * Same as [[getServers]] but allows you to filter by name
     */
    getServersByName(name: string): Server[] {
        return this.getServers().filter(s => {s.name.match(name)});
    }

    /**
     * Same as [[getServersByName]] but allows you to filter by name, un case-sensitive
     */
    getServersByNameIgnoreCase(name: string): Server[] {
        return this.getServers().filter(s => {s.name.toLowerCase().match(name.toLowerCase())});
    }

    /**
     * Gets all users this instance knows about.
     */
    getUsers(): Map<string, User> {
        return this.users;
    }


    /**
     * Same as [[getUsers]] but allows you to filter by name
     */
    getUsersByName(name: string): User[] {
        return Array.from(this.getUsers().values()).filter(e => e.name.match(name));
    }

    /**
     * Same as [[getUsersByName]] but allows you to filter by name, un case-sensitive
     */
    getUserByLogin(login: string): User {
        if (this.users.has(login)) {
            return this.users.get(login);
        }
    }

    /**
     * Creates a new [[ServerBuilder]]
     * W.I.P! Do not use.
     */
    createServerBuilder() {
        //return new ServerBuilder(this);
    }

    /**
     * Opens a private text channel.
     * To be able to read the messages on the other side you have to call this on both clients.
     */
    openPrivateChannelWith(login: string): Promise<TextChannel> {
        return new Promise(async (resolve, reject) => {
            let textChannels = this.thisUser.db.get("privateTextChannels") || {};

            let db;
            let key;
            let key1 = this.thisUser.login+":"+login;
            let key2 = login+":"+this.thisUser.login;
    
            let c = async () => {
                return await TextChannel.create(this, db, key);
            }

            if (textChannels[key1]) {
                db = textChannels[key1].toString();
                key = key1;
                resolve(await c());
            } else if (textChannels[key2]) {
                db = textChannels[key2].toString();
                key = key2;
                resolve(await c());
            } else {
                if (await this.ping(login)) {
                    key = key1;
    
                    let user = await this.getUserData(login);
    
                    let i = 0;
                    user.db.events.on("replicated", async () => {
                        if (i==1) {
                            i++
                            console.log(user.key);
                            db = await this.orbitdb.kvstore("/Anchor-Chat/textChannel/"+key, {
                                write: [
                                    this.orbitdb.key.getPublic("hex"),
                                    user.key.public
                                ]
                            });
            
                            textChannels[key] = db.address.toString();
                            this.thisUser.db.set("privateTextChannels", textChannels);
            
                            await this.ipfs.pubsub.publish("Anchor-Chat/addPrivateChannel/"+login, Buffer.from(JSON.stringify({
                                address: db.address.toString(),
                                key,
                                login: this.thisUser.login
                            })));

                            resolve(await c());
                        } else if (i==0) {
                            i++;
                        }
                    });
    
                } else {
                    throw new AnchorError("To create a new private text channel both users must be online!");
                }
            }
        });
    }

    /**
     * Cleanly stops the instance
     */
    async close() {
        await this.orbitdb.stop();
        await this.ipfs.stop();
    }

    /**
     * Internal use only
     */
    _getServerData(serverAddresses: string[]): Promise<Server[]> {
        return new Promise((resolve, reject) => {
            let servers = [] as Server[];
            serverAddresses.forEach(s => {
                let server = this.servers.filter(e => e.db.address.toString() === s)[0] || null;
                if (!server) {
                    new Server(this, s, server => {
                        this.servers.push(server);
                        servers.push(server);
                    });                
                } else {
                    servers.push(server);
                }
            });

            resolve(servers);
        });
    }

    /**
     * Internal use only
     */ 
    private _queryUserLog(login: string): UserLogEntry[] {
        return this.userLog
            .iterator({ limit: -1 })
            .collect()
            .map(e => e.payload.value)
            .filter(e => e.login === login)
    }

    /**
     * !!!IMPORTANT!!! Internal use only
     */ 
    private async _dbToUser(userDb: KeyValueStore<any>): Promise<User> {
        return await User.create(this, userDb);
    }

    /**
     * Gets a [[User]] instance by login.
     * Only use the db parameter if you have the user's db already opened.
     */
    async getUserData(login: string, db?: KeyValueStore<any>): Promise<User> {
        if (this.users.has(login)) return this.users.get(login);

        let userLogEntry = this._queryUserLog(login)[0] || undefined;

        if (userLogEntry) {
            db = db == undefined ? await this.orbitdb.kvstore(userLogEntry.address) : db;
            await db.load();

            let user = await this._dbToUser(db);
            user.login = login;
    
            this.users.set(login, user);
            return user;
        } else {
            throw new AnchorError("User doesn't exist!");
        }
    }
}

//export default AnchorAPI;