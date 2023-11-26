const EventEmitter = require('events');
const emitter = new EventEmitter();

// Increase the limit to 15
emitter.setMaxListeners(20);



const express=require('express');
const app=express();
const cors=require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');

const port=process.env.PORT||5000;

//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xwlezc0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
const productsCollection=client.db("blitzDb").collection("products");
const reviewCollection=client.db('blitzDb').collection('reviews');
const userCollection=client.db('blitzDb').collection('users');
//jwt related
app.post('/jwt',async(req,res)=>{
  const user=req.body;
  const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
    expiresIn:'1h'
  });
  res.send({token})
})
const verifyToken=(req,res,next)=>{
  console.log('inside verify token',req.headers);
  if(req.headers.authorization){
    return res.status(401).send({message:'forbidden access'})
  }
  next();
}
//user related
app.post('/users',async(req,res)=>{
  const user =req.body;
  const query ={email:user.email}
  const existingUser=await userCollection.findOne(query);
  if(existingUser)
  {
    return res.send({message:'user exists',insertedId:null})
  }
  const result=await userCollection.insertOne(user);
  res.send(result);
})
app.get('/user',verifyToken,async(req,res)=>{
  //console.log(req.headers)
  const result=await userCollection.find().toArray();
  res.send(result)
})
app.get('/user/:email', (req, res) => {
  const userEmail = req.params.email;

  userCollection.findOne({ email: userEmail })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });
    })
  });
  app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id:new ObjectId(id)  };
    const updatedDoc = {
      $set: {
        role: 'admin'
      }
    };
  
    const options = {
      upsert: true // This option performs an upsert operation
    };
  
    const result = await userCollection.updateOne(query, updatedDoc, options);
    res.send(result)
  })
  app.patch('/users/moderator/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id:new ObjectId(id)  };
    const updatedDoc = {
      $set: {
        role: 'moderator'
      }
    };
  
    const options = {
      upsert: true // This option performs an upsert operation
    };
  
    const result = await userCollection.updateOne(query, updatedDoc, options);
    res.send(result)
  })

app.get('/product', async (req, res) => {
    const page = parseInt(req.query.page) || 1; // default to page 1 if not specified
    const itemsPerPage = 20; // adjust as needed
    const skip = (page - 1) * itemsPerPage;

    try {
        const result = await productsCollection
            .find()
            .skip(skip)
            .limit(itemsPerPage)
            .toArray();

        res.send(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/products/:id',async(req,res)=>{
    const id=req.params.id;
    const query ={_id:new ObjectId(id)}
    const result = await productsCollection.findOne(query );
    res.send(result);
 })

  app.get('/product/searchByTag', async (req, res) => {
    try {
      const { Tags } = req.query;
      const tagsArray = Tags.split(',');

      // Use the MongoDB collection to search products by tags
      const products = await productsCollection.find({ Tags: { $in: tagsArray } }).toArray();

      res.json(products);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.get('/review/:id',async(req,res)=>{
    const id=req.params.id;
    const query={product_id:id}
    const result=await reviewCollection.find(query).toArray();
    res.send(result);
 })
  app.post('/reviews',async(req,res)=>{
    const review=req.body;
    const result=await reviewCollection.insertOne(review);
    res.send(result);
 })
 app.patch('/upvote/:id',async(req,res)=>{
    const {id}=req.params;
    const result = await productsCollection.updateOne(
        { _id:new ObjectId(id) },
        { $inc: { vote: 1 } }
      );
      res.send(result)
  

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



app.get('/',(req,res)=>{
    res.send('blitz is running');
})

app.listen(port,()=>{
    console.log(`blitz is running on port ${port}`);
})