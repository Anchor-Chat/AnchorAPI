"use strict";
const crypto = require("crypto");

const algo = "aes256"
const iv = Buffer.alloc(16, 0);

class ChannelData {

	get name() { return this.getField("name") };

	constructor(db) {
		this.db = db;
	}

	keys() {
		let fields = this.db.get("fields");

		return Object.keys(fields);
	}

	values() {
		let fields = this.db.get("fields");

		return Object.keys(fields).map((key) => this.getField(key));
	}

	getField(key) {
		let fields = this.db.get("fields") || {};
		let obj = fields[key] || {};

		let val = obj.value ? JSON.parse(obj.value) : null;

		return val;
	}

	async setField(key, value) {
		value = JSON.stringify(value);

		let obj = this.db.get("fields") || {};

		obj[key] = {
			value,
		};

		return await this.db.set("fields", obj);
	}

}

module.exports = ChannelData;