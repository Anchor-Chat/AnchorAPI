'use strict';
const AnchorAPI = require('./AnchorAPI');
const AccessController = require('orbit-db-access-controllers/src/access-controller-interface');

const io = require('orbit-db-io');

class AnchorAccessController extends AccessController {

	static get type() { return 'anchorAccessController'; }

	constructor(ipfs, options) {
		super();
		this.ipfs = ipfs;
		this.admin = options.admin;
		this.lock = false;
	}

	async canAppend(entry, identityProvider) {
		const key = entry.identity.id;

		console.log(this.admin);

		if (this.admin === key /*|| (AnchorAPI.instance && AnchorAPI.instance.authenticated())*/) {
			//check identity is valid
			return identityProvider.verifyIdentity(entry.identity);
		}
	}

	async save() {
		let cid;
		try {

			cid = await io.write(this.ipfs, 'dag-cbor', { lock: JSON.parse(this.lock) });

		} catch (e) {
			console.log('AnchorAccessController.save ERROR:', e);
		}
		// return the manifest data
		return { address: cid };
	}

	async load(address) {
		if (address.indexOf('/ipfs') === 0) { address = address.split('/')[2]; }

		try {
			this.lock = (await io.read(this.ipfs, address)).lock;

			if (!this.lock) {
				this.lock = true;
			} else {
				this.admin = null;
			}
		} catch (e) {
			console.log('AnchorAccessController.load ERROR:', e);
		}
	}

	static async create(orbitdb, options = {}) {
		options = { ...options, ...{ admin: options.admin || orbitdb.identity.id } };
		return new AnchorAccessController(orbitdb._ipfs, options);
	}

}

module.exports = AnchorAccessController;