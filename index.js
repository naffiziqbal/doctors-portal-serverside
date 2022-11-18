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
        const appointmentCollection = client.db('appointments').collection('appointmentOptions');
        const bookingsInfoCollections = client.db('appointments').collection('bookings')

        app.get('/appointmentOptions', async (req, res) => {
            const query = {};
            const date = req.query.date;
            const cursor = await appointmentCollection.find(query).toArray();

            const bookingQuery = {
                appointmentDate: date
            };
            const alreadyBooked = await bookingsInfoCollections.find(bookingQuery).toArray();

            cursor.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                console.log(optionBooked);
                const bookedSlots = optionBooked.map(book => book.slot)
                console.log(option.name + " Option Name", date, bookedSlots);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots
                console.log(remainingSlots.length);
                console.log(cursor.slots);

            })

            res.send(cursor)

        })
        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const result = await bookingsInfoCollections.insertOne(bookings)
            res.send(result)
        })
        app.get('/bookings', async (req, res) => {
            const query = {}
            const cursor = await bookingsInfoCollections.find(query).toArray()
            res.send(cursor)
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
