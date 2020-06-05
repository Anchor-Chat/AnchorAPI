'use strict';
const { AnchorAPIBuilder } = require('@anchor-chat/anchor-api');

//rimraf(".jsipfs", () => {
//	rimraf(".orbitdb", () => {
console.log('Cleanup done');
new AnchorAPIBuilder()
	.setCredentials('node_person', 'Hi')
	.setDirectory('.a1')
	.createAccount()
	.catch(console.error)
	.then(async (api) => {
		console.log('Start');

		const dm = await ((await api.getUserData('node_person')).createDM());

		//console.log(api);

		api.on('message', async (a) => {
			let msg = await dm.messages.fetchMessage(a);
			console.log(msg.content);
		});

		await dm.send('Hello');
		await dm.send('Hello2');
		await dm.send('Hello3');

		console.log((await dm.messages.fetchMessages({ limit: -1 })).map(e => e.content));

		await api.close();
		console.log('Quit');
		process.exit();
	});
//	});
//});

// (async () => {
// 	window.db = await ob.kvstore("hello", {
// 		accessController: {
// 			write: ["*"]
// 		}
// 	});
// })();
