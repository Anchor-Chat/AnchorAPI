"use strict";
const {
	AnchorAPIBuilder
} = require("@anchor-chat/anchor-api");

//rimraf(".jsipfs", () => {
//	rimraf(".orbitdb", () => {
console.log("Cleanup done");
new AnchorAPIBuilder()
	.setCredentials("node_person", "Hi")
	.setDirectory(".a1")
	.createAccount()
	.catch(console.error)
	.then(async (api) => {
		console.log("Start")

		//if (api) await api.close();

		//let dm = await ((await api.getUserData("lukas2005")).createDM());

		//dm.send("fuck your face (from login)");

		console.log(api.userLog);

		console.log("Quit")
		//process.exit();
	});
//	});
//});

(async () => {
	window.db = await ob.kvstore("hello", {
		accessController: {
			write: ["*"]
		}
	});
})();
