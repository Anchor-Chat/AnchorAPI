const OrbitDB = require("orbit-db");
const IPFS = require("ipfs");

module.exports = (name, type, callback, repo) => {
    let node = new IPFS({
        EXPERIMENTAL: {
            pubsub: true
        },
        repo: repo ? repo : ".jsipfs"
    });

    let orbitdb;

    node.on("error", e => {console.error(e)});
    node.on("ready", async () => {
        try {
            orbitdb = new OrbitDB(node, ".orbitdb");

            const db = await orbitdb.create(name, type, {
                write: ["*"]
            });

            await db.load();

            await orbitdb.stop();
            await node.stop();
            if (require.main === module) {
                console.log("DB Created");
                console.log("Address: " + db.address);
            } else {
                callback(db.address);
            }
        } catch(e) {
            console.error(e);

            await orbitdb.stop();
            await node.stop();
        }
    });
}

if (require.main === module) {
    module.exports(process.argv[2], process.argv[3]);
}