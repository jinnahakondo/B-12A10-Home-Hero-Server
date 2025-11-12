const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
const serviceAccount = require("./home-hero-b7a6e-firebase-adminsdk.json");
require('dotenv').config()
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000;


// <--------firebase admin-------->
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// </-------firebase admin-------->


// middlewere
app.use(cors())
app.use(express.json())
const verifyFBToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    const token = authorization.split(' ')[1]
    try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.token_email = decoded.email;
        next()
    }
    catch {
        return res.status(401).send({ message: "unauthorized access" })
    }
}


// <-------mongodb------->
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.askanda.mongodb.net/?appName=Cluster0`;

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
        const homeHeroDB = client.db('HomeHeroDB')
        const servicesColl = homeHeroDB.collection('Services')

        // booking db 
        const bookingDB = client.db('bookingDB')
        const bookingColl = bookingDB.collection("bookings")

        // <----------apis here--------->
        // get home services 
        app.get('/services', async (req, res) => {
            const result = await servicesColl.find().toArray()
            res.send(result)
        })

        // get home services
        app.get('/services/home', async (req, res) => {
            const result = await servicesColl.find().sort({ created_at: -1 }).limit(6).toArray()
            res.send(result)
        })
        //get a single data 
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const result = await servicesColl.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        // all query servoce

        app.get('/my-services', verifyFBToken, async (req, res) => {
            const email = req.query.email;
            const query = {}
            if (email) {
                if (email !== req.token_email) {
                    return res.status(403).send({ message: "forbidden access" })
                }
                query.email = email;
            }
            const result = await servicesColl.find(query).sort({ created_at: -1 }).toArray();
            res.send(result)
        })

        // add services 
        app.post('/services', async (req, res) => {
            const newServices = req.body;
            const result = await servicesColl.insertOne(newServices);
            res.send(result)
        })

        //update a service
        app.patch('/services/:id', async (req, res) => {
            const id = req.params.id;
            const updateService = req.body;
            const update = { $set: updateService }
            const result = await servicesColl.updateOne({ _id: new ObjectId(id) }, update);
            res.send(result);
        })

        //delete a service
        app.delete('/services/:id', (req, res) => {
            const id = req.params.id;
            const result = servicesColl.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        //post booking services
        app.post('/bookings', async (req, res) => {
            const newBooking = req.body;
            const result = await bookingColl.insertOne(newBooking)
            res.send(result)
        })
        // </---------apis here--------->

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish

    }
}
run().catch(console.dir);
// </-------mongodb------->




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
