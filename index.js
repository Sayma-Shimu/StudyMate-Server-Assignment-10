require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.xnz0dsd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("study-mate");
    const partnersCollection = db.collection("studymates");

    // ✅ Get all partners
    app.get("/partners", async (req, res) => {
      const result = await partnersCollection.find().toArray();
      res.send(result);
    });

    // ✅ Get single partner (for details page)
    app.get("/partners/:id", async (req, res) => {
      const id = req.params.id;
      const result = await partnersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    console.log("Connected to MongoDB!");
  } finally {}
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("StudyMate Backend Running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
