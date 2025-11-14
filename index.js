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
    const requestsCollection = db.collection("partnerRequests"); // make sure this exists in DB

    // Get all partners
    app.get("/partners", async (req, res) => {
      const result = await partnersCollection.find().toArray();
      res.send(result);
    });

    // Get single partner
    app.get("/partners/:id", async (req, res) => {
      const partnerId = req.params.id;
      const partner = await partnersCollection.findOne({ _id: new ObjectId(partnerId) });
      if (!partner) return res.status(404).send({ message: "Partner not found" });
      res.send(partner);
    });

    // Send Partner Request
    app.post("/send-request/:id", async (req, res) => {
      try {
        const partnerId = req.params.id;
        const { userEmail } = req.body;

        // Find partner
        const partner = await partnersCollection.findOne({ _id: new ObjectId(partnerId) });
        if (!partner) return res.status(404).send({ success: false, message: "Partner not found" });

        // Increase partnerCount
        const updatedPartner = await partnersCollection.findOneAndUpdate(
          { _id: new ObjectId(partnerId) },
          { $inc: { partnerCount: 1 } },
          { returnDocument: "after" }
        );

        // Save request in partnerRequests collection
        await requestsCollection.insertOne({
          partnerId: new ObjectId(partnerId),
          partnerName: partner.name,
          partnerProfileImage: partner.profileImage,
          userEmail,
          createdAt: new Date(),
        });

        res.send({ success: true, message: "Partner request sent successfully!" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Something went wrong!" });
      }
    });

    console.log("Backend connected to MongoDB!");
  } finally {}
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("StudyMate Backend Running"));
app.listen(port, () => console.log(`Server running on port ${port}`));
