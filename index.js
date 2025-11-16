require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.xnz0dsd.mongodb.net/?retryWrites=true&w=majority`;

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
    const partners = db.collection("studymates");
    const requests = db.collection("partnerRequests");

    // ⭐ FIRST: Top Rated Route (must come early!)
    app.get("/partners/top-rated", async (req, res) => {
      try {
        const topPartners = await partners
          .find()
          .sort({ rating: -1 })
          .limit(3)
          .toArray();

        res.send(topPartners);
      } catch (error) {
        res.status(500).send({ success: false, message: "Server error!" });
      }
    });

    // Get all partners
    app.get("/partners", async (req, res) => {
      const data = await partners.find().toArray();
      res.send(data);
    });

    // Single partner (must come AFTER top-rated)
    app.get("/partners/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const partner = await partners.findOne({ _id: new ObjectId(id) });

        if (!partner)
          return res.status(404).send({ message: "Partner not found" });

        res.send(partner);
      } catch (error) {
        res.status(400).send({ message: "Invalid ID format" });
      }
    });

    // Send Request + increase partnerCount
    app.post("/send-request/:id", async (req, res) => {
      try {
        const partnerId = req.params.id;
        const { userEmail } = req.body;

        if (!userEmail)
          return res.send({ success: false, message: "Login required" });

        const partner = await partners.findOne({ _id: new ObjectId(partnerId) });
        if (!partner)
          return res
            .status(404)
            .send({ success: false, message: "Partner not found" });

        const requestObj = {
          partnerId: new ObjectId(partnerId),
          partnerName: partner.name,
          partnerProfileImage: partner.profileImage,
          subject: partner.subject,
          studyMode: partner.studyMode,
          userEmail,
          note: "",
          createdAt: new Date(),
        };

        await requests.insertOne(requestObj);

        await partners.updateOne(
          { _id: new ObjectId(partnerId) },
          { $inc: { partnerCount: 1 } }
        );

        res.send({
          success: true,
          message: "Request sent & partnerCount updated!",
        });
      } catch (error) {
        res.status(500).send({ success: false, message: "Server error!" });
      }
    });

    // Get requests
    app.get("/requests", async (req, res) => {
      const email = req.query.email;
      const data = await requests.find({ userEmail: email }).toArray();
      res.send(data);
    });

    // Delete request
    app.delete("/requests/:id", async (req, res) => {
      const id = req.params.id;
      await requests.deleteOne({ _id: new ObjectId(id) });
      res.send({ success: true });
    });

    // Update request
    app.patch("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await requests.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.send({ success: true, result });
    });

    console.log("Backend running");
  } finally {}
}

run().catch(console.dir);
app.listen(port, () => console.log(`Server running on port ${port}`));
