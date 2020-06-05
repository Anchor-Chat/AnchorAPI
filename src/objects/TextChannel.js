const Channel = require('./Channel');
const Message = require('./Message');
const MessagesData = require('./MessagesData');

const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
const utils = require('../utils');

class TextChannel extends Channel {

	constructor(channelData, api) {
		super(channelData, api);

		this.messages = new MessagesData(this, api);
	}

	async _init() {
		await this.messages.initDB();
	}

	async _entryIntoMsg(data, _, __, altVerif) {
		let author = await this.api.getUserData(data.author);

		//let verify = crypto.createVerify("RSA-SHA256");
		//verify.update(altVerif || data.content);
		//verify.end();

		//let pubKey = author.userProfile.getField("publicKey");

		//let verified = verify.verify(pubKey, data.signature, "hex");

		return new Message(data.content, {
			author,
			signature: data.signature,
			//verified,
			id: data.id,
			channel: this
		});
	}

	send(content, options, data) {
		return this.messages.addMessage(content, options, data);
	}

	acknowledge() {

	}

}

module.exports = TextChannel;