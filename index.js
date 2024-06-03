const express = require('express');
const mongoose = require('mongoose');

const app = express();

var cors = require('cors');

app.use(cors());

app.use(express.json()); // so that we can access the req.body

const AppRouter = require('./routes/index');
app.use(express.urlencoded({ extended: false }));
app.use('/api/v1', AppRouter);
mongoose.connect(
  'mongodb+srv://sparsh:BuWgE0vkJ362Jcb0@cluster0.f9gliqe.mongodb.net/monopoly?retryWrites=true&w=majority'
);

app.listen(3000, () => {
  console.log('listening on port 3000');
});
