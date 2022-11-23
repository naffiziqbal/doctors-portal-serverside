const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');

const app = express();


app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster1.zscbcon.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//Middleware For Verify JWT 

const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send("UnAuthorized User")
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'Unauthorised Token' })
        }
        req.decoded = decoded;
        next()
    })

}
async function run() {
    try {
        const appointmentCollection = client.db('appointments').collection('appointmentOptions');
        const bookingsInfoCollections = client.db('appointments').collection('bookings')
        const userssInfoCollections = client.db('appointments').collection('users');
        const doctorsCollection = client.db('appointments').collection('doctors');

        //   A Middleware For Checking Whether The User is Admin or Not! 
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userssInfoCollections.findOne(query);


            if (user.role !== 'admin') {
                return res.status(401).send({ message: " Forbidden Access" })
            }
            next()

        }



        // Get All Appointment Option From the Server! 
        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date; //get appointment date
            const query = {};
            const email = req.query.email //get user email
            const cursor = await appointmentCollection.find(query).toArray(); // get All Of The Appointment Data 

            // Checking whether the user has any booking at that time or not 
            const bookingQuery = {
                appointmentDate: date,
                email: email
            };
            const alreadyBooked = await bookingsInfoCollections.find(bookingQuery).toArray();

            cursor.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);

                const bookedSlots = optionBooked.map(book => book.slot) //Getting Booked Slot 


                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot)); // Get The Remaiing Slot That Day 

                option.slots = remainingSlots //append Them as Free Slot And Remove Booked Slot !



            })

            res.send(cursor)

        })


        // Get Filterd Appointment Data 
        app.get('/appointmentData', async (req, res) => {
            const query = {};
            const data = await appointmentCollection.find(query).project({ name: 1 }).toArray()
            res.send(data)

        })

        // Store Already Booked Data in DB 
        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const email = req.query.email


            // Check whether the user alreadyBooked any slot 
            const query = {
                appointmentDate: bookings.appointmentDate,
                treatment: bookings.treatment,
                email: email
            }

            const alreadyBooked = await bookingsInfoCollections.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You Have a Booking Already ${bookings.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsInfoCollections.insertOne(bookings)
            res.send(result)
        })

        // Get All bookings Data 

        app.get('/allbookings', async (req, res) => {
            const query = {}
            const cursor = await bookingsInfoCollections.find(query).toArray()
            res.send(cursor)
        })


        // Get Booking Only For That User 
        app.get('/bookings', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodEmail = req.decoded.email;

            if (email !== decodEmail) {
                res.status(401).send({ message: "forbidden Access/Unauthorized User" })
            }
            const query = {
                email
            }
            const cursor = await bookingsInfoCollections.find(query).toArray()
            res.send(cursor)
        })


        // Create User and Set Them In DB 

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userssInfoCollections.insertOne(user);
            res.send(result)
        })

        // Get User data from  DB 
        app.get('/users', async (req, res) => {
            const result = await userssInfoCollections.find({}).toArray();
            res.send(result)
        })


        // Delete User  
        app.delete('/allusers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await userssInfoCollections.deleteOne(filter);
            res.send(result)
        })

        //  Update User as an Admin 
        app.put('/users/admin/:id', verifyJwt, verifyAdmin, async (req, res) => {
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

        // Get Admins data only 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userssInfoCollections.findOne(query);
            console.log(user);
            res.send({ isAdmin: user?.role === "admin" })

        })
        app.get('/users/admin/', verifyJwt, verifyAdmin, async (req, res) => {
            const query = { role: 'admin' };
            const user = await userssInfoCollections.find(query).toArray();
            console.log(user);
            res.send(user)

        });

        // Get Single User 
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const filter = {
                email: email
            }
            const result = await userssInfoCollections.findOne(filter)
            console.log(result);
            res.send(result)
        })


        //Update User Name 
        app.put('/dashboard/user/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id, ' id');
            const displayName = req.body.displayName;
            console.log(displayName, ' name');
            const filter = { _id: ObjectId(id) }
            console.log(filter);

            const option = { upsert: true }
            const updateName = {
                $set: {
                    displayName: displayName
                }
            }
            const result = await userssInfoCollections.updateOne(filter, option, updateName)
            res.send(result)
            console.log(result)
        })

        // Create Doctor 
        app.post('/doctors', verifyJwt, async (req, res) => {
            const doctors = req.body;
            const result = await doctorsCollection.insertOne(doctors);
            res.send(result)
        })
        // Get Doctors 
        app.get('/doctors', verifyJwt, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await doctorsCollection.find(query).toArray();
            res.send(result)
        })
        // Delete Doctors 
        app.delete('/doctors/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await doctorsCollection.deleteOne(query)
            res.send(result)
        })

        //Update Price 
        app.get('/addprice', async (req, res) => {
            const filter = {}
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    price: 99
                }
            }
            const result = appointmentCollection.updateMany(filter, updateDoc, option)
            res.send(result)
        })
        // Send JWT Token To User 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }

            const user = await userssInfoCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email },
                    process.env.ACCESS_TOKEN)
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: " " }) //If There is no user! Send Empty Token 
            console.log(process.env.ACCESS_TOKEN);

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
