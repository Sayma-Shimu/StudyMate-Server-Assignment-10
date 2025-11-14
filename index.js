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
    const requestsCollection = db.collection("partnerRequests");

    // ---------------------------
    // GET ALL PARTNERS
    // ---------------------------
    app.get("/partners", async (req, res) => {
      const result = await partnersCollection.find().toArray();
      res.send(result);
    });

    // ---------------------------
    // SINGLE PARTNER
    // ---------------------------
    app.get("/partners/:id", async (req, res) => {
      const partnerId = req.params.id;
      const partner = await partnersCollection.findOne({
        _id: new ObjectId(partnerId),
      });

      if (!partner)
        return res.status(404).send({ message: "Partner not found" });

      res.send(partner);
    });

    // ---------------------------
    // SEND REQUEST
    // ---------------------------
    app.post("/send-request/:id", async (req, res) => {
      try {
        const partnerId = req.params.id;
        const { userEmail } = req.body;

        const partner = await partnersCollection.findOne({
          _id: new ObjectId(partnerId),
        });

        if (!partner)
          return res
            .status(404)
            .send({ success: false, message: "Partner not found" });

        await partnersCollection.updateOne(
          { _id: new ObjectId(partnerId) },
          { $inc: { partnerCount: 1 } }
        );

        await requestsCollection.insertOne({
          partnerId: new ObjectId(partnerId),
          partnerName: partner.name,
          partnerProfileImage: partner.profileImage,
          subject: partner.subject,
          studyMode: partner.studyMode,
          userEmail,
          note: "",
          createdAt: new Date(),
        });

        res.send({
          success: true,
          message: "Partner request sent successfully!",
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Error occurred!" });
      }
    });

    // ---------------------------
    // GET REQUESTS BY USER
    // ---------------------------
    app.get("/requests", async (req, res) => {
      const email = req.query.email;
      const result = await requestsCollection
        .find({ userEmail: email })
        .toArray();

      res.send(result);
    });

    // ---------------------------
    // DELETE REQUEST
    // ---------------------------
    app.delete("/requests/:id", async (req, res) => {
      const id = req.params.id;

      const result = await requestsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send({ success: true });
    });

    // ---------------------------
    // UPDATE REQUEST
    // ---------------------------
    app.patch("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const { note } = req.body;

      await requestsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { note } }
      );

      res.send({ success: true });
    });

    console.log("MongoDB Connected!");
  } finally {}
}
run().catch(console.dir);

app.get("/", (req, res) => res.send("StudyMate Backend Running"));
app.listen(port, () => console.log(`Server running on port ${port}`));
