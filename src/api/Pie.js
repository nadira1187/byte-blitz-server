const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xwlezc0.mongodb.net/<dbname>?retryWrites=true&w=majority`);



// Define your schemas
const productSchema = new Schema({
    Product_name: {
      type: String,
      required: true,
    },
    Product_image: {
      type: String,
      required: true,
    },
    Tags: {
      type: [String],
      default: [],
    },
    Date: {
      type: Date,
      default: Date.now,
    },
    Status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    Description: {
      type: String,
      required: true,
    },
    External_Links: {
      type: [String],
      default: [],
    },
    Product_id: {
      type: String,
      required: true,
      unique: true,
    },
    Featured: {
      type: Boolean,
      default: false,
    },
    vote: {
      type: Number,
      default: 0,
    },
    report: {
      type: Number,
      default: 0,
    },
    Owner_email: {
      type: String,
      required: true,
    },
  });
  

  const reviewSchema = new Schema({
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    ratings: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
  });
  
 
  const userSchema = new Schema({
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
  });
  

// Create your models
const Product = mongoose.model('Product', productSchema);
const Review = mongoose.model('Review', reviewSchema);
const User = mongoose.model('User', userSchema);

// Export the function to retrieve data for the pie chart
module.exports = {
  getPieChartData: async () => {
    try {
      const productCount = await Product.countDocuments();
      const reviewCount = await Review.countDocuments();
      const userCount = await User.countDocuments();

      return {
        productCount,
        reviewCount,
        userCount
      };
    } catch (error) {
      console.error('Error fetching data for pie chart:', error);
      throw new Error('Internal Server Error');
    }
  }
};

