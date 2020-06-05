'use strict';
const EventEmitter = require('eventemitter3');

const UserProfile = require('./objects/UserProfile');
const User = require('./objects/User');

const DMHelper = require('./DMHelper');

class AnchorAPI extends EventEmitter {

	get user() {
		return this.users.get(this.userProfile.login);
	}

	get publicKey() {
		return this.userProfile.getField('publicKey');
	}

	constructor(userProfile, orbitdb, ipfs, userLog) {
		super();

		if (userProfile === null) throw new Error();

		this.userProfile = userProfile;
		this.orbitdb = orbitdb;
		this.ipfs = ipfs;
		this.userLog = userLog;

		this.privateKey = this.userProfile.getField('privateKey');

		this.users = new Map();
		this.users.set(this.userProfile.login, new User(this.userProfile, this));
	}

	static async create(userProfile, orbitdb, ipfs, userLog) {
		let api = new AnchorAPI(userProfile, orbitdb, ipfs, userLog);
		api.dmHelper = await DMHelper.create(orbitdb, api);

		return api;
	}

	authenticated() {
		return this.userProfile.verifyPass();
	}

	/**
	 * Gets all users this instance knows about.
	 */
	getUsers() {
		return this.users;
	}

	/**
	 * Same as [[getUsers]] but allows you to filter by name
	 */
	getUsersByName(username) {
		return Array.from(this.getUsers().values()).filter(e => e.username.match(username));
	}

	/**
	 * Same as [[getUsersByName]] but allows you to filter by login
	 */
	getUserByLogin(login) {
		if (this.users.has(login)) {
			return this.users.get(login);
		}
	}

	getDMChannels() {
		return this.dmHelper.getChannels();
	}

	/**
     * Gets a [[User]] instance by login.
     */
	async getUserData(login) {
		if (this.users.has(login)) return this.users.get(login);

		let userLogEntry = this.userLog
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => e.login === login)[0] || null;

		if (userLogEntry) {
			let db = await this.orbitdb.kvstore(userLogEntry.address);
			await db.load();

			let userProfile = new UserProfile(db, login);
			let user = new User(userProfile, this);

			this.users.set(login, user);
			return user;
		} else {
			throw new Error('User doesn\'t exist!');
		}
	}

	async close() {
		await this.orbitdb.stop();
		await this.ipfs.stop();
	}
}

module.exports = AnchorAPI;