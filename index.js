const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require('stripe')(process.env.PAYMENT_KEY)
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pyhg6t2.mongodb.net/?retryWrites=true&w=majority`;

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

    const userCollection = client.db("DiagnosticDB").collection("users");
    const testCollection = client.db("DiagnosticDB").collection("tests");
    const upozilaCollection = client.db("DiagnosticDB").collection("upozila");
    const bannerCollection = client.db("DiagnosticDB").collection("banners");
    const paymentCollection = client.db("DiagnosticDB").collection("payments");
    const testResultCollection = client.db("DiagnosticDB").collection("testResults");

    // user related operation

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      let user;
      if (email) {
        user = { email: email };
      }
      const result = await userCollection.find(user).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const findMail = await userCollection.findOne(filter);
      if (findMail) {
        return res.send({ message: "email already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.put("/users/:email", async (req, res) => {
      const data = req.body;
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          name: data.name,
          district: data.district,
          upozila: data.upozila,
          blood: data.blood,
          profileImage: data.profileImage,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const user = await userCollection.findOne(filter);
      let changedStatus;
      if (user.active_status) {
        if (user.active_status === "block") {
          changedStatus = "active";
        } else {
          changedStatus = "block";
        }
      }

      const updatedDoc = {
        $set: {
          active_status: changedStatus || "block",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // banner data
    // app.get('/banners', async(req, res) => {

    // })

    app.get("/banners", async (req, res) => {
      const query = req.query.isActive;
      let banner;
      if (query) {
        banner = { isActive : query };
      }
      const result = await bannerCollection.find(banner).toArray();
      res.send(result);
    });

    app.post('/banners', async(req, res) => {
        const bannerInfo = req.body;
        const result = await bannerCollection.insertOne(bannerInfo);
        res.send(result)
     })

     app.delete("/banners/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannerCollection.deleteOne(query);
      res.send(result);
    });



    // test related operation

    app.get("/tests", async (req, res) => {
        const id = req.query.id;
        let query
        if(id){
            query = {_id : new ObjectId(id)}
        }
      const result = await testCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/tests", async (req, res) => {
      const data = req.body;
      const result = await testCollection.insertOne(data);
      res.send(result);
    });

    app.put("/tests/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const slot = req.query.slot;
      const filter = { _id: new ObjectId(id) };
      let update;
      if(slot){
        update = {$inc : {slot : -1}}
      }
      else{
        update = {
          $set: {
            test_name: data.test_name,
            photo: data.photo,
            date: data.date,
            price: data.price,
            details: data.details,
          },
        };
      }
      const result = await testCollection.updateOne(
        filter,
        update
      );
      res.send(result);
    });

    app.delete("/tests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.deleteOne(query);
      res.send(result);
    });

    // upozila
    app.get("/upozila", async (req, res) => {
      const query = req.query.district_id;
      const filter = { district_id: query };
      const result = await upozilaCollection.find(filter).toArray();
      res.send(result);
    });

    // payment and reservation related api

    app.post('/payment-intent', async(req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency : 'usd',
        payment_method_types: ['card']
      });
      res.send({clientSecret : paymentIntent.client_secret})
    })


    app.get('/payments', async(req, res) => {
      const email = req.query.email;
      let query;
      if(email){
        query = {email : email}
      };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async(req, res) => {
      const data = req.body;
      const result = await paymentCollection.insertOne(data);
      res.send(result)
    })

    app.delete('/payments/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await paymentCollection.deleteOne(query);
      res.send(result)
    })

    app.put("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set : {
          status : 'Delivered'
        }
      }
      const result = await paymentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


    // Test result api

    app.get('/testResult', async(req, res) => {
      const email = req.query.email;
      const testName = req.query.testName;
      let query;
      if(email && testName){
        query = {$and : [{email : email}, {testName : testName}]}
      }
      else if(email){
        query = {email : email}
      }
      const result = await testResultCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/testResult', async(req, res) => {
      const data = req.body;
      const result = await testResultCollection.insertOne(data);
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/health", (req, res) => {
  res.send("Fm diagnostic is running");
});

app.listen(port, () => {
  console.log(`diagnostic center is running on port ${port}`);
});
