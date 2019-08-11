const Channel = require("./Channel");
const DMChannel = require("./DMChannel");
const Message = require("./Message");

const crypto = require("crypto");
const uuidv4 = require("uuid/v4");
const utils = require("../utils");

class TextChannel extends Channel {

	constructor(channelData, api) {
		super(channelData, api);

		channelData.db.events.on("replicated", e => this._fetchMsg());

		this.messages = new Map();

		if (!(this instanceof DMChannel))
			this._fetchMsg(true);
	}

	async _fetchMsg(noEvents) {
		let msgData = this.channelData.getField("messages");

		let msgNew = msgData.map(m => m.id);
		let msgOld = Array.from(this.messages.keys());
		if (!utils.arraysEqual(msgNew, msgOld)) {

			(await Promise.all(msgData.map(this._entryIntoMsg, this))).forEach((m) => {
				this.messages.set(m.id, m);

				if (!msgOld.includes(m.id) && !noEvents) {
					this.api.emit("message", m);
				}
			});

			// msgOld.forEach(id => {
			// 	if (!msgNew.includes(id)) {
			// 		this.api.emit("messageDelete", id);
			// 	}
			// });
		}
	}

	async _entryIntoMsg(data, _, __, altVerif) {
		let author = await this.api.getUserData(data.author);

		let verify = crypto.createVerify("RSA-SHA256");
		verify.update(altVerif || data.content);
		verify.end();

		let pubKey = author.userProfile.getField("publicKey");

		let verified = verify.verify(pubKey, data.signature, "hex");

		return new Message(data.content, {
			author,
			signature: data.signature,
			verified,
			id: data.id,
			channel: this
		})
	}

	async send(content, options, data) {
		let messages = this.channelData.getField("messages");

		let sign = crypto.createSign("RSA-SHA256");
		sign.update(content);
		sign.end();

		let signature = sign.sign(this.api.privateKey, "hex");

		messages.push({
			...data,
			content,
			signature,
			author: this.api.user.login,
			id: uuidv4(),
			options
		});

		await this.channelData.setField("messages", messages);
		this._fetchMsg();
	}

	acknowledge() {

	}

}

module.exports = TextChannel;