const {
    AnchorAPIBuilder
} = require("anchor-api");
let userName = "LOL";

let config1 = {
    config: {
        "Addresses": {
            "Swarm": [
                "/ip4/0.0.0.0/tcp/4003",
                "/ip6/::/tcp/4003"
            ]
        }
    }
}

let password = "1337P455W0rD"

let messages = [
    "Hello!"
]

new AnchorAPIBuilder()
    .setDirectory(".anchor2")
    .setIPFSConfig(config1)
    .setLoginAndPassword(userName, password)
    .createAccount()
    .then(async (api) => {
        api.on("privateTextChannelOpen", async (login) => {
            console.log("privateTextChannelOpen");
            let textChannel = await api.openPrivateChannelWith(login);

            textChannel.on("message", (msg) => {
                console.log(msg.author.login+": "+msg.text);
            });
            messages.forEach(async (e) => {
                console.log(e);
                await textChannel.sendMessage(e);
            });
            console.log(await textChannel.getMessageHistory());
        });
    });