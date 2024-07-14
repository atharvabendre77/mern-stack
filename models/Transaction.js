const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  sold: Boolean,
  category: String,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
