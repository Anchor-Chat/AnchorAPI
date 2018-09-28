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


describe("ServerBuilder", () => {

    it("Creates a server instance", (done) => {
        const node = new IPFS(ipfsOptions);

        node.on('error', done);
        node.on("ready", async () => {
            new AnchorAPIBuilder({
                ipfs: node,
                userToken: Math.random().toString()
            }).login((anchor) => {

                anchor
                .createServerBuilder()
                .setName("Hello")
                .create()
                .then((s) => {
                    assert.notEqual(s, undefined);
                    assert.equal(anchor.db.get("servers").length, 1);

                    rimraf.sync("./orbitdb");
                    //if (fs.existsSync(ipfsOptions.path)) rimraf.sync(ipfsOptions.path);
                
                    done();
                });

            });
        });
    });

});