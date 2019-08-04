const Channel = require("./Channel");
const Message = require("./Message");

const crypto = require("crypto");

class TextChannel extends Channel {

	async getMessages() {
		let msgData = this.channelData.getField("messages");
		if (msgData.length != this._cache.length) {
			this._cache = await Promise.all(msgData.map(this.entryIntoMsg, this));
		}
		return this._cache;
	}

	constructor(channelData, api) {
		super(channelData, api);

		channelData.db.events.on("replicated", () => {
		//	AnchorAPI.instance.emit();
		});

		this._cache = [];
	}

	async entryIntoMsg(data, _, __, altVerif) {
		let author = await this.api.getUserData(data.author);

		let verify = crypto.createVerify("sha256");
		verify.update(altVerif || data.content);
		verify.end();

		let pubKey = author.userProfile.getField("publicKey");

		let verified = verify.verify(pubKey, data.signature, "hex");

		return new Message(data.content, {
			author,
			signature: data.signature,
			verified,
			channel: this
		})
	}

	async send(content, options, data) {
		let messages = this.channelData.getField("messages");

		let sign = crypto.createSign("sha256");
		sign.update(content);
		sign.end();

		let signature = sign.sign(this.api.privateKey, "hex");

		messages.push({
			...data,
			content,
			signature,
			author: this.api.user.login,
			options
		});

		await this.channelData.setField("messages", messages);
	}

	acknowledge() {

	}

}

module.exports = TextChannel;