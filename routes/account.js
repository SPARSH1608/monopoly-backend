const express = require('express');

const { authMiddleware } = require('../middleware');
const { default: mongoose } = require('mongoose');
const { Account } = require('../db');

const router = express.Router();

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const account = await Account.findOne({ userId: userId });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.status(200).json({ balance: account.balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { amount, to } = req.body;

    const account = await Account.findOne({ userId: req.userId }).session(
      session
    );
    if (!account || account.balance < amount) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Insufficient balance' });
    }
    const toAccount = await Account.findOne({ userId: to }).session(session);
    if (!toAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Invalid User' });
    }
    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } }
    ).session(session);

    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    await session.commitTransaction();
    res.json({
      message: 'Transfer successful',
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});
module.exports = router;
