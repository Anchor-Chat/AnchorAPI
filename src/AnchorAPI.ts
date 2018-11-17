import OrbitDB from "orbit-db"
import IPFS = require("ipfs");
import Server from "./object/Server";
import { KeyValueStore } from "orbit-db-kvstore";
import TextChannel from "./object/TextChannel";
import ServerBuilder from "./ServerBuilder";
import UserLogEntry from "./object/UserLogEntry";
import { EventStore } from "orbit-db-eventstore";
import { User } from "./object/User";
import AnchorError from "./exceptions/AnchorError";
import { EventEmitter } from "events";

export class AnchorAPI extends EventEmitter {

    ipfs: IPFS;
    orbitdb: OrbitDB;

    userLog: EventStore<UserLogEntry>;

    thisUser: User;

    private servers: Server[] = [];
    private users: Map<string, User>;

    constructor(ipfs: IPFS, orbitdb: OrbitDB, userLog: EventStore<UserLogEntry>, login: string) {
        super();
        this.ipfs = ipfs;
        this.orbitdb = orbitdb;
        this.userLog = userLog;
        this.users = new Map();
    }

    static async create(ipfs: IPFS, orbitdb: OrbitDB, db: KeyValueStore<any>, userLog: EventStore<UserLogEntry>, login: string): Promise<AnchorAPI> {
        let api = new AnchorAPI(ipfs, orbitdb, userLog, login);
        api.thisUser = await api._getUserData(login, db);
        
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

    getServers(): Server[] {
        return this.servers;
    }

    getServersByName(name: string): Server[] {
        return this.getServers().filter(s => {s.name.match(name)});
    }

    getServersByNameIgnoreCase(name: string): Server[] {
        return this.getServers().filter(s => {s.name.toLowerCase().match(name.toLowerCase())});
    }

    getUsers(): Map<string, User> {
        return this.users;
    }

    getUsersByName(name: string): User[] {
        return Array.from(this.getUsers().values()).filter(e => e.name.match(name));
    }

    getUserByLogin(login: string): User {
        if (this.users.has(login)) {
            return this.users.get(login);
        }
    }

    createServerBuilder(): ServerBuilder {
        return new ServerBuilder(this);
    }

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
    
                    let user = await this._getUserData(login);
    
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

    async close() {
        await this.orbitdb.stop();
        await this.ipfs.stop();
    }

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

    private _queryUserLog(login: string): UserLogEntry[] {
        return this.userLog
            .iterator({ limit: -1 })
            .collect()
            .map(e => e.payload.value)
            .filter(e => e.login === login)
    }

    private async _dbToUser(userDb: KeyValueStore<any>): Promise<User> {
        return await User.create(this, userDb);
    }

    async _getUserData(login: string, db?: KeyValueStore<any>): Promise<User> {
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

export default AnchorAPI;