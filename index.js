const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const e = require('express');

const app = express();


app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster1.zscbcon.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri);

const verifyJwt = (req, res, next) => {
    console.log(req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send("UnAuthorized User")
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'Forbiden Access' })
        }
        req.decoded = decoded;
        next()
    })

}
async function run() {
    try {
        const appointmentCollection = client.db('appointments').collection('appointmentOptions');
        const bookingsInfoCollections = client.db('appointments').collection('bookings')
        const userssInfoCollections = client.db('appointments').collection('users')


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
        app.get('/bookings', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const query = {
                email
            }
            const decodEmail = req.decoded.email;
            if (email !== decodEmail) {
                res.status(401).send({ message: "forbidden Access" })
            }
            const cursor = await bookingsInfoCollections.find(query).toArray()
            res.send(cursor)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }

            const user = await userssInfoCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "1h" })
                return res.send({ accessToken: token })
            }
            console.log(user);
            res.status(403).send({ accessToken: " " })

        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userssInfoCollections.insertOne(user);
            res.send(result)
        })
        app.get('/users', async (req, res) => {
            const result = await userssInfoCollections.find({}).toArray();
            res.send(result)
        })
        app.put('/users/admin/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userssInfoCollections.findOne(query);
            if (user.role !== 'admin') {
                return res.status(401).send({ message: " Forbidden Access" })
            }
            const option = { upsert: true }
            const filter = {
                _id: ObjectId(id)
            }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userssInfoCollections.updateOne(filter, updateDoc, option)
            res.send(result)
        })
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userssInfoCollections.findOne(query);
            console.log(user);
            res.send({ isAdmin: user?.role === "admin" })

        })
        app.get('/users/admin/', async (req, res) => {
            const query = {role : 'admin' };
            const user = await userssInfoCollections.find(query).toArray();
            console.log(user);
            res.send(user)

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
