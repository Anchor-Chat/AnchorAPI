const DMChannel = require('./objects/DMChannel');
const Channel = require('./objects/Channel');
const ChannelData = require('./objects/ChannelData');
const crypto = require('crypto');

const Reference = require('./Reference');
const utils = require('./utils');

const uuidv4 = require('uuid/v4');

function once(emitter, event, timeout) {
	return new Promise((resolve) => {
		if (timeout) {
			setTimeout(resolve, timeout);
		}

		emitter.once(event, resolve);
	});
}

class DMHelper {

	constructor(db, orbitdb, api) {
		//super();
		this.db = db;
		this.orbitdb = orbitdb;
		this.api = api;
		this.channels = new Map();

		db.events.on('replicated', () => this.fetchChannels());
		this.fetchChannels();
	}

	static async create(orbitdb, api) {
		let dmLog = await orbitdb.log(Reference.DM_LOG_NAME, {
			accessController: {
				write: ['*']
			}
		});
		await dmLog.load();

		return new DMHelper(dmLog, orbitdb, api);
	}

	getChannels() {
		return Array.from(this.channels.values());
	}

	async fetchChannels() {
		let channelEntries = this.db
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => e.members.includes(this.api.user.login));

		let oldChannelIds = Array.from(this.channels.keys());
		let channelIds = channelEntries.map(c => c.id);

		channelIds.forEach(async (id) => {
			if (!oldChannelIds.includes(id)) {
				let channel = await this.entryToChannel(channelEntries.filter(e => e.id === id)[0]);
				this.api.emit('dmChannelCreate', channel);
			}
		});

	}

	async getChannelFor(user) {
		let arr = user === this.api.user ? [user.login] : [user.login, this.api.user.login];

		let channelEntry = this.db
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => utils.arraysEqual(e.members, arr))[0] || null;

		if (channelEntry) {
			return await this.entryToChannel(channelEntry, true);
		} else {
			return await this.newDMChannel([user]);
		}
	}

	async getGroupChannelFor(members) {
		let memberLogins = members.map(m => m.login);
		let channelEntry = this.db
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => utils.arraysEqual(e.members, memberLogins))[0] || null;

		if (channelEntry) {
			return await this.entryToChannel(channelEntry);
		} else {
			return await this.newDMChannel(members);
		}
	}

	async newDMChannel(members) {
		let id = uuidv4();

		if (!members.includes(this.api.user))
			members.push(this.api.user);

		// TODO: Create custom access controller for DMs
		let channelDb = await this.orbitdb.kvstore(`Anchor-Chat.channels.${id}`, {
			accessController: {
				write: ['*']
			}
		});
		await channelDb.load();

		let channelData = new ChannelData(channelDb);
		await Channel.init(channelData, 'dm', id);

		let passphrase = crypto.randomBytes(4096);
		let keys = {};

		members.forEach((member) => {
			keys[member.login] = crypto.publicEncrypt(member.userProfile.getField('publicKey'), passphrase).toString('hex');
		});

		await channelData.setField('keys', keys);

		let memberLogins = members.map(m => m.login);
		await channelData.setField('members', memberLogins);

		let channel = new DMChannel(channelData, this.api);

		await channel._init();

		await this.db.add({
			members: memberLogins,
			address: channelDb.address.toString(),
			id
		});

		this.channels.set(id, channel);

		this.api.emit('dmChannelCreate', channel);
		this.api.emit('dmChannelUpdate');

		return channel;
	}

	async entryToChannel(channelEntry, existing) {
		existing = existing || false;

		if (this.channels.has(channelEntry.id))
			return this.channels.get(channelEntry.id);

		let channelDb = await this.api.orbitdb.kvstore(channelEntry.address, {

		});
		await channelDb.load();

		if (!existing)
			await once(channelDb.events, 'replicated', 5000);

		let channelData = new ChannelData(channelDb);
		let channel = new DMChannel(channelData, this.api);

		await channel._init();

		this.channels.set(channel.id, channel);

		this.api.emit('dmChannelUpdate');

		return channel;
	}

}

module.exports = DMHelper;