"use strict";
const crypto = require("crypto");

const algo = "aes256"

class UserProfile {

	constructor(db, login, key) {
		this.login = login;
		this.db = db;
		this.key = key;
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
		let fields = this.db.get("fields")
		let obj = fields[key] || {};

		if (obj.isPrivate && this.key) {
			console.log(obj.iv)
			let decipher = crypto.createDecipheriv(algo, this.key, obj.iv);
			obj.value = decipher.update(obj.value, "hex", "utf8") + decipher.final("utf8");
		} else if (!this.key) {
			throw new Error("Cipher not provided!");
		}

		//console.log(obj.value);
		return JSON.parse(obj.value);
	}

	async setField(key, value, isPrivate) {
		let entry = {
			value: JSON.stringify(value),
			isPrivate
		};

		if (isPrivate && this.key) {
			let iv = crypto.randomBytes(8).toString("hex");

			let cipher = crypto.createCipheriv(algo, this.key, iv);
			entry.value = cipher.update(entry.value, "utf8", "hex") + cipher.final("hex");
			entry.iv = iv;
			console.log(iv);
		} else if (!this.key) {
			throw new Error("Cipher not provided!");
		}

		let obj = this.db.get("fields") || {};

		if (!isPrivate) console.log(entry.value);
		obj[key] = entry;

		return await this.db.set("fields", obj);
	}

	reEncrypt(newKey) {
		return new Promise((resolve, reject) => {
			let fields = this.db.get("fields");

			Object.keys(fields).forEach(async key => {
				let value = this.getField(key);
				let obj = fields[key];

				this.key = newKey;

				await this.setField(key, value, obj.isPrivate);
			});
			resolve();
		})
	}

	verifyPass() {
		try {
			//this.getField("privateKey");
			return true;
		} catch (e) {
			if (e.reason === "bad decrypt") {
				return false;
			}
			throw e;
		}
	}

	getEntry() {
		return {
			login: this.login,
			address: this.db.address.toString()
		}
	}
}

module.exports = UserProfile;