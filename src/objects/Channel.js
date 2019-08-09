class Channel {

	get createdAt() { return this.channelData.getField("createdAt") };
	get type() { return this.channelData.getField("type") };
	get deleted() { return this.channelData.getField("deleted") };
	get id () { return this.channelData.getField("id") }

	constructor(channelData, api) {
		this.channelData = channelData;
		this.api = api;
	}

	static async init(channelData, type, id) {
		await channelData.setField("createdAt", Date.now());
		await channelData.setField("type", type);
		await channelData.setField("deleted", false);
		await channelData.setField("id", id);

		switch (type) {
			case ("dm"):
				await channelData.setField("members", []);
				await channelData.setField("keys", {});
			case ("text"):
				await channelData.setField("messages", []);
				break;
		}

		return channelData;
	}

	async delete() {
		this.channelData.setField("deleted", true)
	}
}

module.exports = Channel;