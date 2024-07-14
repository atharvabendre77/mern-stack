const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/mern_stack_challenge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  sold: Boolean,
  category: String,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Initialize Database with Seed Data
app.get('/api/init', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    await Transaction.deleteMany({});
    await Transaction.insertMany(transactions);

    res.status(200).send('Database initialized with seed data');
  } catch (error) {
    res.status(500).send('Error initializing database');
  }
});

// List All Transactions with Search and Pagination
app.get('/api/transactions', async (req, res) => {
  const { search, page = 1, perPage = 10, month } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: { $regex: search, $options: 'i' } },
    ];
  }

  if (month) {
    query.dateOfSale = { $regex: `-${month}-`, $options: 'i' };
  }

  const transactions = await Transaction.find(query)
    .skip((page - 1) * perPage)
    .limit(parseInt(perPage));

  res.status(200).json(transactions);
});

// Statistics API
app.get('/api/statistics', async (req, res) => {
  const { month } = req.query;

  const match = { dateOfSale: { $regex: `-${month}-`, $options: 'i' } };

  const totalSaleAmount = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$price' } } },
  ]);

  const totalSoldItems = await Transaction.countDocuments({ ...match, sold: true });
  const totalNotSoldItems = await Transaction.countDocuments({ ...match, sold: false });

  res.status(200).json({
    totalSaleAmount: totalSaleAmount[0]?.total || 0,
    totalSoldItems,
    totalNotSoldItems,
  });
});

// Bar Chart API
app.get('/api/bar-chart', async (req, res) => {
  const { month } = req.query;

  const match = { dateOfSale: { $regex: `-${month}-`, $options: 'i' } };

  const priceRanges = [
    { range: '0-100', min: 0, max: 100 },
    { range: '101-200', min: 101, max: 200 },
    { range: '201-300', min: 201, max: 300 },
    { range: '301-400', min: 301, max: 400 },
    { range: '401-500', min: 401, max: 500 },
    { range: '501-600', min: 501, max: 600 },
    { range: '601-700', min: 601, max: 700 },
    { range: '701-800', min: 701, max: 800 },
    { range: '801-900', min: 801, max: 900 },
    { range: '901-above', min: 901, max: Infinity },
  ];

  const results = await Promise.all(
    priceRanges.map(async (range) => {
      const count = await Transaction.countDocuments({
        ...match,
        price: { $gte: range.min, $lte: range.max === Infinity ? Number.MAX_SAFE_INTEGER : range.max },
      });
      return { range: range.range, count };
    })
  );

  res.status(200).json(results);
});

// Pie Chart API
app.get('/api/pie-chart', async (req, res) => {
  const { month } = req.query;

  const match = { dateOfSale: { $regex: `-${month}-`, $options: 'i' } };

  const categories = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  res.status(200).json(categories);
});

// Combined API
app.get('/api/combined', async (req, res) => {
  const { month } = req.query;

  const statistics = await axios.get(`http://localhost:3000/api/statistics?month=${month}`);
  const barChart = await axios.get(`http://localhost:3000/api/bar-chart?month=${month}`);
  const pieChart = await axios.get(`http://localhost:3000/api/pie-chart?month=${month}`);

  res.status(200).json({
    statistics: statistics.data,
    barChart: barChart.data,
    pieChart: pieChart.data,
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
