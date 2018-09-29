const assert = require("assert");
const os = require("os");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");

const {AnchorAPIBuilder} = require("anchor-api");
const IPFS = require("ipfs");

const ipfsOptions = {
    EXPERIMENTAL: {
        pubsub: true
    },
    repo: path.join(os.tmpdir(), ".jsipfs"+Math.random().toString())
}


describe("AnchorAPI", () => {
    describe("db", () => {
        it("Creates a db on init", (done) => {
            const node = new IPFS(ipfsOptions);

            node.on('error', done);
            node.on("ready", async () => {
                new AnchorAPIBuilder(genAnchorConfig(node))
                .setIPFS(node)
                .setLoginAndPassword("lukas2005", "lukasz2005")
                .createAccount()
                .then(async (anchor) => {

                    await anchor.close();
                    await node.stop();
                    //rimraf.sync("./orbitdb");
                    
                    //if (fs.existsSync(ipfsOptions.path)) rimraf.sync(ipfsOptions.path);

                    done();
                });
            });
        });

    });


})

function genAnchorConfig(ipfs) {
    return {
        ipfs,
        userToken: Math.random().toString()
    } 
}