const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

const mongoUrl = "mongodb://localhost:27017";
const dbName = "Eventsdb";
const collectionName = "events";

async function connectToDatabase() {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db(dbName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

// Basic Hello World endpoint
app.get("/api/v3/hello/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

// Get events with optional pagination and filtering
app.get("/api/v3/app/events", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const eventId = req.query.id;

    if (eventId) {
      const event = await db.collection(collectionName).findOne({ _id: new ObjectId(eventId) });
      if (event) {
        res.json(event);
      } else {
        res.status(404).json({ error: "Event not found" });
      }
    } else {
      const events = await db.collection(collectionName).find({}).toArray();
      res.json(events);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get events with pagination and sorting
app.get('/api/v3/app/events_pagination', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 10; // Default limit
    const page = parseInt(req.query.page) || 1; // Default page number
    const skip = (page - 1) * limit; // Calculate how many documents to skip

    const query = {};
    const events = await db.collection(collectionName)
      .find(query)
      .sort(type === 'latest' ? { schedule: -1 } : {})
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new event with nudge tagging
app.post("/api/v3/app/events", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const event = {
      type: "event",
      uid: req.body.uid,
      name: req.body.name,
      tagline: req.body.tagline,
      schedule: req.body.schedule,
      description: req.body.description,
      files: req.body.files,
      moderator: req.body.moderator,
      category: req.body.category,
      sub_category: req.body.sub_category,
      rigor_rank: req.body.rigor_rank,
      attendees: [],
      nudge: {
        tagged: req.body.tagged || false,
        title: req.body.nudgeTitle || ""
      }
    };

    const result = await db.collection(collectionName).insertOne(event);
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update an existing event
app.put("/api/v3/app/events/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const eventId = req.params.id;

    const existingEvent = await db.collection(collectionName).findOne({ _id: new ObjectId(eventId) });
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    const updateData = {
      ...existingEvent,
      name: req.body.name !== undefined ? req.body.name : existingEvent.name,
      files: req.body.files !== undefined ? req.body.files : existingEvent.files,
      tagline: req.body.tagline !== undefined ? req.body.tagline : existingEvent.tagline,
      schedule: req.body.schedule !== undefined ? req.body.schedule : existingEvent.schedule,
      description: req.body.description !== undefined ? req.body.description : existingEvent.description,
      moderator: req.body.moderator !== undefined ? req.body.moderator : existingEvent.moderator,
      category: req.body.category !== undefined ? req.body.category : existingEvent.category,
      sub_category: req.body.sub_category !== undefined ? req.body.sub_category : existingEvent.sub_category,
      rigor_rank: req.body.rigor_rank !== undefined ? req.body.rigor_rank : existingEvent.rigor_rank,
      nudge: {
        tagged: req.body.tagged !== undefined ? req.body.tagged : existingEvent.nudge.tagged,
        title: req.body.nudgeTitle !== undefined ? req.body.nudgeTitle : existingEvent.nudge.title
      }
    };

    const result = await db.collection(collectionName).updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updateData }
    );

    if (result.modifiedCount === 1) {
      res.json({ message: "Event updated" });
    } else {
      res.status(404).json({ error: "Event not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete an event
app.delete("/api/v3/app/events/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 1) {
      res.json({ message: "Event deleted" });
    } else {
      res.status(404).json({ error: "Event not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Nudge an event
app.post("/api/v3/app/events/nudge", async (req, res) => {

  try {
    const db = await connectToDatabase();
const nudge = {
  tag: req.body.tag,
  title: req.body.title,
  coverImage: req.body.coverImage,
  schedule: {
    date: req.body.date,
    time: {
      start: req.body.startTime,
      end: req.body.endTime
    }
  },
  description: req.body.description,
  icon: req.body.icon,
  invitationText: req.body.invitationText
};
const result = await db.collection('nudges').insertOne(nudge);
res.status(201).json({ id: result.insertedId });

  } catch (error) {
    console.error(error)
  }
  
})

// Start the server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});