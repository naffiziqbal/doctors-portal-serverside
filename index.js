const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express()

app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster1.zscbcon.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri);

async function run() {
    try {
        const appointmentCollection = client.db('appointments').collection('appointmentOptions')

        app.get('/appointmentOptions', async (req, res) => {
            const query = {};
            const cursor = await appointmentCollection.find(query).toArray()
            res.send(cursor)
            console.log(cursor);

        })
    }
    finally {

    }
}
run().catch(err => console.log(err)
)



app.get('/', (req, res) => {
    res.send('Doc Portal Running')
})

app.listen(port, () => {
    console.log('Sever Running');
})
