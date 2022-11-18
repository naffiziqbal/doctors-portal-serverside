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
            const email = req.query.email
            const cursor = await appointmentCollection.find(query).toArray();

            const bookingQuery = {
                appointmentDate: date,
                email: email
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
            const email = req.query.email


            const query = {
                appointmentDate: bookings.appointmentDate,
                treatment: bookings.treatment,
                email: email
            }
            const alreadyBooked = await bookingsInfoCollections.find(query).toArray()
            if (alreadyBooked.length) {
                const message = `You Have a Booking Already ${bookings.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsInfoCollections.insertOne(bookings)
            res.send(result)
        })
        app.get('/allbookings', async (req, res) => {
            const query = {}
            const cursor = await bookingsInfoCollections.find(query).toArray()
            res.send(cursor)
        })
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = {
                email
            }
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
