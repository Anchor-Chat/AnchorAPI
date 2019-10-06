class MessagesData {

	constructor(channel, api) {
		this.api = api;
		this.channel = channel;
	}

	async initDB() {
		let msgDb = await this.api.orbitdb.feed(`anchorChat.channels.${this.channel.id}.messages`, {
			accessController: {
				write: ["*"]
			}
		});
		await msgDb.load();

		if (!this.channel.channelData.getField("messages")) { 
			await this.channel.channelData.setField("messages", msgDb.address.toString());
		}

		msgDb.events.on("replicated", e => {
			this.api.emit("messageChange");
		});

		this.db = msgDb;
	}

	async diff () {
	}

	// async _fetchMsg(noEvents) {
	// 	let msgData = this.channelData.getField("messages");

	// 	let msgNew = msgData.map(m => m.id);
	// 	let msgOld = Array.from(this.messages.keys());
	// 	if (!utils.arraysEqual(msgNew, msgOld)) {

	// 		(await Promise.all(msgData.map(this.channel._entryIntoMsg, this.channel))).forEach((m) => {
	// 			this.messages.set(m.id, m);

	// 			if (!msgOld.includes(m.id) && !noEvents) {
	// 				this.api.emit("message", m);
	// 			}
	// 		});

	// 		// msgOld.forEach(id => {
	// 		// 	if (!msgNew.includes(id)) {
	// 		// 		this.api.emit("messageDelete", id);
	// 		// 	}
	// 		// });
	// 	}
	// }

	async addMessage(content, options, data) {
		//let sign = crypto.createSign("RSA-SHA256");
		//sign.update(content);
		//sign.end();

		//let signature = sign.sign(this.api.privateKey, "hex");

		let obj = {
			...data,
			content,
			//signature,
			author: this.api.user.login,
			options
		};

		let a = await this.db.add(obj);
		this.api.emit("message", a);

		return a;
	}

	async fetchMessage(id) {
		let msgEntry = this.db.get(id).payload.value;

		msgEntry.id = id;
		return await this.channel._entryIntoMsg(msgEntry);
	}

	fetchMessages(options) {
		let msgEntries = this.db
			.iterator(options)
			.collect();

		return Promise.all(msgEntries
			.map(e => { e.payload.value.id = e.hash; return e.payload.value })
			.map(this.channel._entryIntoMsg, this.channel)
		);
	}
}

module.exports = MessagesData;