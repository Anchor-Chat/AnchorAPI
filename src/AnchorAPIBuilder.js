"use strict";
const AnchorAccessController = require("./AnchorAccessController");
const AnchorAPI = require("./AnchorAPI");

const UserProfile = require("./objects/UserProfile");

const AuthError = require("./errors/AuthError");

const IPFS = require('ipfs');
const OrbitDB = require('orbit-db');

const AccessControllers = require('orbit-db-access-controllers');
AccessControllers.addAccessController({ AccessController: AnchorAccessController });

const path = require("path");
const crypto = require("crypto");

const Reference = require("./Reference");

class AnchorAPIBuilder {

	constructor() {
		this.setDirectory(".anchor");
		this.ipfs = null;
		this.ipfsOpts = {};
		this.orbitdb = null;
		this.password = null;
		this._login = null;
		this.directory = ".anchor";
	}

    /**
     * Sets the directory where all data will be stored (.oribtdb and .jsipfs)
     */
	setDirectory(directory) {
		this.directory = directory;
		return this;
	}

    /**
     * !!!UNRECOMMENDED!!!<br>
     * Use this if you have your own ipfs instance ready.
     * Make sure it has EXPERIMENTAL.pubsub = true in the config.
     * If you only need to change config of the ipfs node see [[setIPFSConfig]]
     */
	setIPFS(ipfs) {
		this.ipfs = ipfs;
		return this;
	}

    /**
     * Sets the login and password.
     */
	setCredentials(login, password) {

		this.password = password;

		this._login = login;

		return this;
	}

    /**
     * Sets the config of a ipfs node that's about to be created.
     * Unused if [[setIPFS]] is called.
     */
	setIPFSConfig(opts) {
		this.ipfsOpts = opts;

		return this;
	}

    /**
     * !!!IMPORTANT!!!
     * Internal use only
     */
	_setDefaults() {
		return new Promise((resolve, reject) => {
			if (this.ipfs === null) {
				this.ipfs = IPFS.createNode({
					EXPERIMENTAL: {
						pubsub: true
					},
					repo: path.join(this.directory, ".jsipfs"),
					...this.ipfsOpts
				});
			}

			this.ipfs.on("error", (err) => {
				return reject(err);
			});

			let fun = async () => {
				if (this.orbitdb === null) {
					this.orbitdb = await OrbitDB.createInstance(this.ipfs, {
						directory: path.join(this.directory, ".orbitdb"),
						AccessControllers: AccessControllers
					});

					this.userLog = await this.orbitdb.log(Reference.USER_LOG_DB, { write: ["*"] });
					await this.userLog.load();
				}

				resolve();
			}

			if (!this.ipfs.isOnline()) {
				this.ipfs.on("ready", () => {
					console.log("Hi")
					fun();
				});
			} else {
				fun();
			}
		});
	}

    /**
     * Creates a new account with credentials set in [[setCredentials]]
     */
	async createAccount() {
		await this._setDefaults();

		let u = this.userLog
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => e.login === this._login)[0] || null;

		if (u) {
			return await this.login(u);
		}

		const userDB = await this.orbitdb.kvstore("Anchor-Chat/" + this._login, {
			accessController: {
				//type: "anchorAccessController"
			}
		});
		await userDB.load();

		let passHash = crypto.createHash("sha256")
			.update(this.password)
			.digest();

		let profile = new UserProfile(userDB, this._login, passHash);

		await this.userLog.add(profile.getEntry());

		await profile.setField("username", this._login);
		//await profile.setField("password", passHash.toString("hex"), true);

		const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
			modulusLength: 4096,
			publicKeyEncoding: {
				type: 'spki',
				format: 'pem'
			},
			privateKeyEncoding: {
				type: 'pkcs8',
				format: 'pem'
				// cipher: 'aes-256-cbc',
				// passphrase: this.password
			}
		});

		await profile.setField("publicKey", publicKey);
		await profile.setField("privateKey", privateKey, true);

		return await AnchorAPI.create(profile, this.orbitdb, this.ipfs);
	}

    /**
     * Logs in to a account with credentials set in [[setLoginAndPassword]].
     */
	async login(u) {
		await this._setDefaults();

		u = u || this.userLog
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => e.login === this._login)[0] || null;

		if (u) {
			const userDB = await this.orbitdb.kvstore(u.address, {
				accessController: {
					//type: "anchorAccessController"
				}
			});
			await userDB.load();

			let passHash = crypto.createHash("sha256")
				.update(this.password)
				.digest();

			let profile = new UserProfile(userDB, this._login, passHash);

			// await profile.setField("hi", "ewww")
			// console.log(profile.getField("hi"));

			if (profile.verifyPass()) {
				return await AnchorAPI.create(profile, this.orbitdb, this.ipfs, this.userLog);
			} else {
				throw new AuthError("Wrong password provided!");
			}
		} else {
			throw new AuthError(`Account with login "${this._login}" doesn't exist`);
		}
	}

}

module.exports = AnchorAPIBuilder;