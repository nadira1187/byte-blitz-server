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
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1h'
  });
  res.send({ token });
  
})
const verifyToken=(req,res,next)=>{
 // console.log('inside verify token',req.headers);
  if(!req.headers.authorization){
    return res.status(401).send({message:'forbidden access'})
  }
  const token = req.headers.authorization.split(' ')[1];
  console.log('Received Token:', token);


  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).send({ message: 'token expired' });
        }
        return res.status(401).send({ message: 'unauthorized access' });
    }

    req.decoded = decoded;
    next();
});

}
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}
const verifyModerator = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isModerator = user?.role === 'moderator';
  if (!isModerator) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}

//user related
app.get('/user',verifyToken,verifyAdmin,async(req,res)=>{
  //console.log(req.headers)
  const result=await userCollection.find().toArray();
  res.send(result)
})
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
  app.get('/users/admin/:email', verifyToken,verifyAdmin, async (req, res) => {
    const email = req.params.email;
    console.log(req.decoded.email);
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
    }

    const query = { email: email };
    const user = await userCollection.findOne(query);
    //let admin = false;
    if (user) {
      admin = user?.role === 'admin';
    }
    res.send( admin );
  })
  app.get('/user/moderator/:email', verifyToken,verifyModerator, async (req, res) => {
    const email = req.params.email;
    console.log(req.decoded.email);
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
    }

    const query = { email: email };
    const user = await userCollection.findOne(query);
    //let admin = false;
    if (user) {
      moderator = user?.role === 'moderator';
    }
    res.send( moderator );
  })
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
 // Assuming you have a MongoDB connection and productsCollection set up

app.get('/reviewproducts', async (req, res) => {
  try {
      const products = await productsCollection.find().sort({ status: 1 }).toArray();
      // Sorting based on the 'status' field in ascending order (1 for ascending, -1 for descending)

      // Render your page with the products data
      res.send( products );
  } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/featuredproducts', async (req, res) => {
 
      const featuredProducts = await productsCollection.find({ Featured: true })
          .sort({ Date: -1 }) // Sorting based on the 'Date' field in descending order
          .toArray();

      // Render your page with the featured products data
      res.send( featuredProducts );

});
app.get('/topvoted', async (req, res) => {
  
      const topVotedProducts = await productsCollection.find()
          .sort({ vote: -1 }) 
          .limit(6) 
          .toArray();

    
      res.send( topVotedProducts);
});


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
 app.patch('/report/:id',async(req,res)=>{
  const {id}=req.params;
  const result = await productsCollection.updateOne(
      { _id:new ObjectId(id) },
      { $inc: { vote: 1 } }
    );
    res.send(result)


})
app.patch('/featured/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id:new ObjectId(id)  };
  const updatedDoc = {
    $set: {
      Featured: true
    }
  };
  const result = await productsCollection.updateOne(query, updatedDoc, { upsert: true });
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