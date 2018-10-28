const {
    AnchorAPIBuilder
} = require("anchor-api");

const rimraf = require("rimraf");
rimraf.sync(".anchor1");
rimraf.sync(".anchor2");

let userName1 = "XD";
let userName2 = "LOL";

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

let config2 = {
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


setTimeout(() => {
    new AnchorAPIBuilder()
    .setDirectory(".anchor1")
    .setIPFSConfig(config1)
    .setLoginAndPassword(userName1, password)
    .createAccount()
    .then(async (api) => {
        let textChannel = await api.openPrivateChannelWith(userName2);

        messages.forEach(async (e) => {
            console.log(e);
            await textChannel.sendMessage(e);
        });

        textChannel.on("message", (msg) => {
            console.log(msg.author.login+": "+msg.text);
        });
    });
}, 30000)

new AnchorAPIBuilder()
    .setDirectory(".anchor2")
    .setIPFSConfig(config2)
    .setLoginAndPassword(userName2, password)
    .createAccount()
    .then((api) => {
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