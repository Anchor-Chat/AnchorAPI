
window.login = (login, ipfs) => {
	new window.anchor.AnchorAPIBuilder()
		.setCredentials(login, "pass")
		.setDirectory(`.${login}`)
		.setIPFS(ipfs)
		.createAccount()
		//.catch(console.error)
		.then(async (api) => {
			window.api = api;
		});
}