const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
// Connect to MongoDB

const app = express();
app.use(cors());
// Define a route to retrieve data

app.use(bodyParser.json());
mongoose
  .connect(
    "mongodb+srv://sakshamsharmawalmart:a0sQ4cJSVhxIb6dU@cluster0.dfbgtxu.mongodb.net/mydatabase",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Define a schema for your
const Schema = mongoose.Schema;
const orderSchema = new Schema({
  cartItems: [
    {
      itemId: String,
      count: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model("Orders", orderSchema);

app.get("/confirm-order", async (req, res) => {
  try {
    console.log("Request at /confirm-order");
    // Create instances of the model and save them
    const items = await fetch("http://localhost:3001/cartItems");
    const itemsjson = await items.json();
    if (itemsjson.length > 0) {
      const order = new Order({ cartItems: itemsjson });
      await order.save();
      await fetch("http://localhost:3001/order-confirmed");
      res.send("Data inserted successfully");
    } else console.log("Cart is empty");
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ error: "Error inserting data" });
  }
});

app.get("/orders", async (req, res) => {
  console.log("Request at /orders");
  const Orders = await Order.find({});
  const ids = Orders.flatMap((order) => {
    const cartItems = order.cartItems;
    const cartIDs = cartItems.map((item) => item.itemId);
    return cartIDs;
  });
  const distinctIDs = [...new Set(ids)];
  const productDetails = await fetch(
    "http://localhost:3000/get-product-details",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(distinctIDs),
    }
  );
  const productDetailsJSON = await productDetails.json();

  const updatedData = Orders.map((item) => {
    const updatedCartItems = item.cartItems.map((cartItem) => {
      const count = cartItem.count;
      const itemId = cartItem.itemId;
      const { name, price, description } = productDetailsJSON.filter(
        (product) => product.id == cartItem.itemId
      )[0];

      return {
        name,
        price,
        description,
        count,
        itemId,
      };
    });
    const createdAt = item.createdAt;
    console.log(updatedCartItems);
    return {
      cartItems: updatedCartItems,
      createdAt,
    };
  });
  res.send(updatedData);
});

// Start the server
app.listen(3002, () => {
  console.log("Server is running at PORT:3002");
});
