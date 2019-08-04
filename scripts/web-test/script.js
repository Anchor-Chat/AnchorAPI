new window.Anchor.AnchorAPIBuilder()
	.setCredentials("browser_person", "pass")
	.createAccount()
	.catch(console.error)
	.then(async (api) => {
		window.api = api;
	});