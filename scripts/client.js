const {
    AnchorAPIBuilder
} = require("anchor-api");

let api;

waitForUserInput("Create account or login? (C/l)").then(async (i) => {
    switch (i.toLowercase()) {
        case("c"):

            let login = await waitForUserInput("Login: ");
            let pass = await waitForUserInput("Password: ");

            api = await new AnchorAPIBuilder()
                .setDirectory(".anchor1")
                .setLoginAndPassword(login, pass)
                .createAccount()
            break;
        case("l"):
            let login = await waitForUserInput("Login: ");
            let pass = await waitForUserInput("Password: ");

            api = await new AnchorAPIBuilder()
                .setDirectory(".anchor1")
                .setLoginAndPassword(login, pass)
                .login()
            break;
    }
    let targetLogin = await waitForUserInput("Login of the person you want to talk with: ");
    
    let textChannel = await api.openPrivateChannelWith(targetLogin);

    textChannel.on("message", (msg) => {
        console.log(msg.author.login+": "+msg.text);
    });

    let text = waitForUserInput(">");
    while(text != "exit") {

        textChannel.sendMessage(text);

        text = waitForUserInput(">");
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