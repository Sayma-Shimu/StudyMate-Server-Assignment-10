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
    // await client.connect();
    const db = client.db("study-mate");
    const partners = db.collection("studymates");
    const requests = db.collection("partnerRequests");

    //  TOP RATED PARTNERS
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

    //   Search + Sort
    app.get("/partners", async (req, res) => {
      try {
        const { search, sort } = req.query;

        const experienceOrder = {
          Beginner: 1,
          Intermediate: 2,
          Expert: 3,
        };

        let query = {};

        // SEARCH BY SUBJECT
        if (search) {
          query.subject = { $regex: search, $options: "i" };
        }

        let data = await partners.find(query).toArray();

        // SORT BY EXPERIENCE
        if (sort === "asc") {
          data.sort(
            (a, b) =>
              (experienceOrder[a.experienceLevel] || 0) -
              (experienceOrder[b.experienceLevel] || 0)
          );
        } else if (sort === "desc") {
          data.sort(
            (a, b) =>
              (experienceOrder[b.experienceLevel] || 0) -
              (experienceOrder[a.experienceLevel] || 0)
          );
        }

        res.send({ success: true, data });
      } catch (error) {
        res.status(500).send({ success: false, message: "Server error!" });
      }
    });

    // profile by email
    app.get("/profile", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send({ status: 404, message: "User not found" });
      }

      const userProfile = await partners.findOne({ email });
      res.send(userProfile);
    });

    // single partner
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

    // send request
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

    //  all request
    app.get("/requests", async (req, res) => {
      const email = req.query.email;
      const data = await requests.find({ userEmail: email }).toArray();
      res.send(data);
    });

    // delete request
    app.delete("/requests/:id", async (req, res) => {
      const id = req.params.id;
      await requests.deleteOne({ _id: new ObjectId(id) });
      res.send({ success: true });
    });

    // update request
    app.patch("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await requests.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.send({ success: true, result });
    });

    // update profile
    app.patch("/profile/update/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await partners.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.send({ success: true, result });
    });

    console.log("Backend running");
  } finally { }
}

app.get('/', async (req, res)=>{
res.send({
  message: 'hello world'
})
})

run().catch(console.dir);
app.listen(port, () => console.log(`Server running on port ${port}`));
