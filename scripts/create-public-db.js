const OrbitDB = require("orbit-db");
const IPFS = require("ipfs");

let node = new IPFS({
    EXPERIMENTAL: {
        pubsub: true
    }
});

let orbitdb;

node.on("error", e => {console.error(e)});
node.on("ready", async () => {
    try {
        orbitdb = new OrbitDB(node);

        const db = await orbitdb.create(process.argv[2], process.argv[3], {
            write: ["*"]
        });

        await db.load();

        await orbitdb.stop();
        await node.stop();
        console.log("DB Created");
        console.log("Address: " + db.address);
    } catch(e) {
        console.error(e);

        await orbitdb.stop();
        await node.stop();
        
        process.exit(1);
    }
});

