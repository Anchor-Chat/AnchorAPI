const {
    AnchorAPIBuilder
} = require("anchor-api");
let userName1 = "XD";

let config1 = {
    config: {
        "Addresses": {
            "Swarm": [
                "/ip4/0.0.0.0/tcp/4002",
                "/ip6/::/tcp/4002"
            ]
        }
    }
}

let password = "1337P455W0rD"

let messages = [
    "Hello!"
]

new AnchorAPIBuilder()
    .setDirectory(".anchor1")
    .setIPFSConfig(config1)
    .setLoginAndPassword(userName1, password)
    .createAccount()
    .then(async (api) => {
        let textChannel = await api.openPrivateChannelWith("LOL");

        messages.forEach(async (e) => {
            console.log(e);
            await textChannel.sendMessage(e);
        });

        textChannel.on("message", (msg) => {
            console.log(msg.author.login+": "+msg.text);
        });
    });