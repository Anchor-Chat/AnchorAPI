const {
    AnchorAPIBuilder
} = require("anchor-api");

let api;

let port = 4001;

let conf = {
    config: {
        Addresses: {
            Swarm: [
                "/ip4/127.0.0.1/tcp/",
                "/ip4/127.0.0.1/tcp/",
                "/ip4/192.168.0.108/tcp/",
            ]
        }
    }
}

let login;
let pass;
waitForUserInput("Create account or login? (C/l)").then(async (i) => {
    let ix = await waitForUserInput("I ");

    port += parseInt(ix);

    conf.config.Addresses.Swarm.forEach((e,i) => e.match(".*ip4.*") ? conf.config.Addresses.Swarm[i] = e+port : false);

    switch (i.toLowerCase()) {
        case("c"):

            login = await waitForUserInput("Login: ");
            pass = await waitForUserInput("Password: ");

            api = await new AnchorAPIBuilder()
                .setDirectory(".anchor"+String(ix))
                .setIPFSConfig(conf)
                .setLoginAndPassword(login, pass)
                .createAccount()
            break;
        case("l"):
            login = await waitForUserInput("Login: ");
            pass = await waitForUserInput("Password: ");

            api = await new AnchorAPIBuilder()
                .setDirectory(".anchor"+String(ix))
                .setIPFSConfig(conf)
                .setLoginAndPassword(login, pass)
                .login()
            break;
    }

    // setInterval(() => {
    //     console.log(api.userLog.iterator().collect());
    // }, 10000);

    let targetLogin = await waitForUserInput("Login of the person you want to talk with: ");
    
    let textChannel = await api.openPrivateChannelWith(targetLogin);

    textChannel.on("message", (msg) => {
        console.log(msg.author.login+": "+msg.text+"\n>");
    });

    let text = await waitForUserInput(">");
    while(text != "exit") {
        textChannel.sendMessage(text);

        text = await waitForUserInput(">");
    }

});

function waitForUserInput (text) {
    return new Promise((resolve, reject) => {
        process.stdin.resume()
        process.stdout.write(text)
        process.stdin.once('data', data => resolve(data.toString().trim()))
        process.stdin.once('error', reject)
    });
}
