const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pyhg6t2.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("DiagnosticDB").collection("users");

    app.get("/users", async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result)
    })

    app.post("/users", async(req, res)=> {
        const user = req.body;
        const filter = {email: user.email};
        const findMail = await userCollection.findOne(filter)
        if(findMail){
            return res.send({message: "email already exist"})
        }
        const result = await userCollection.insertOne(user)
        res.send(result);
    })

    app.patch('/users/admin/:id', async(req, res) => {
        const id = req.params.id;
        const filter = {_id : new ObjectId(id)};
        const updatedDoc = {
            $set : {
                role : "admin"
            }
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.patch('/users/:id', async(req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = {_id : new ObjectId(id)};
        const user = await userCollection.findOne(filter)
        let changedStatus
        if(user.active_status){
            if(user.active_status === 'block'){
                changedStatus = 'active'
            } else{
                changedStatus = 'block'
            }
        }

        const updatedDoc = {
            $set: {
                active_status : changedStatus || 'block'
            }
        }
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result)
    })

    app.post('/users/admin/:email', async(req, res) => {
        const email = req.params.email;
        const query = {email : email};
        const user = await userCollection.findOne(query);
        let admin;
        if(user){
            admin = user?.role === 'admin'
        }
        res.send({admin});
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/health", (req, res) => {
    res.send("Fm diagnostic is running")
});


app.listen(port, ()=> {
    console.log(`diagnostic center is running on port ${port}`);
})