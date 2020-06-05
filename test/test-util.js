/* eslint-disable */
var fs = require('fs');

module.exports = {
	getIPFSConfig(port) {
		return {
			EXPERIMENTAL: {
				pubsub: true
			},
			config: {
				Addresses: {
					Swarm: [
						`/ip4/0.0.0.0/tcp/${port}`,
						`/ip4/127.0.0.1/tcp/${port}/ws`
					],
					API: '',
					Gateway: ''
				}
			}
		};
	},
	rmdir(path) {
		if (fs.existsSync(path)) {
			fs.readdirSync(path).forEach((file, index) => {
				let curPath = path + '/' + file;
				if (fs.lstatSync(curPath).isDirectory()) { // recurse
					this.rmdir(curPath);
				} else { // delete file
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(path);
		}
	}
}

(async () => {

	let crypto = window.crypto.subtle;

	let keyPair = await crypto.generateKey(
		{
			name: 'RSA-OAEP',
			modulusLength: 4096,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['encrypt', 'decrypt']
	);
	
	var enc = new TextDecoder('utf-8');

	console.log(enc.decode(await crypto.exportKey('spki', keyPair.publicKey)));
	console.log(enc.decode(await crypto.exportKey('pkcs8', keyPair.privateKey)));

})();