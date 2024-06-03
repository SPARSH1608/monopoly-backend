const express = require('express');

const zod = require('zod');
const { User } = require('../db');
const { JWT_SECRET } = require('../config');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware');
const router = express.Router();
const { Account } = require('../db');

const signupSchema = zod.object({
  username: zod.string().email().max(100),
  firstName: zod.string(),
  lastName: zod.string(),
  password: zod.string(),
});

const signInSchema = zod.object({
  username: zod.string().email(),
  password: zod.string(),
});

const updateBodySchema = zod.object({
  password: zod.string().min(6),
  firstName: zod.string(),
  lastName: zod.string(),
});

router.post('/signup', async (req, res) => {
  const body = req.body;
  const { success } = signupSchema.safeParse(req.body);
  if (!success) {
    return res.json({ message: ' Incorrect inputs' });
  }
  const user = User.findOne({
    username: body.username,
  });
  if (user._id) {
    return res.status(404).json({ message: 'Email already taken' });
  }
  const dbUser = await User.create({
    username: req.body.username,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  });
  await Account.create({
    userId: dbUser._id,
    balance: 10000,
  });
  const token = jwt.sign(
    {
      userId: dbUser._id,
    },
    JWT_SECRET
  );
  res.json({ message: 'User created successfully', token: token });
});

router.post('/signin', async (req, res) => {
  const { success } = signInSchema.safeParse(req.body);
  if (!success) {
    return res.status(411).json({
      message: 'Email already taken / Incorrect inputs',
    });
  }

  try {
    const user = await User.findOne({
      username: req.body.username,
      password: req.body.password,
    });

    if (user) {
      const token = jwt.sign(
        {
          userId: user._id,
        },
        JWT_SECRET
      );
      res.cookie('token', token);
      return res.status(200).json({
        token: token,
        user: user,
      });
    }

    return res.status(411).json({
      message: 'Invalid username or password',
    });
  } catch (error) {
    console.error('Error signing in:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});

router.put('/', authMiddleware, async (req, res, next) => {
  try {
    const { success, data, error } = updateBodySchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        message: 'Validation error',
        error: error.errors.map((err) => err.message),
      });
    }

    await User.updateOne(req.body, {
      id: req.userId,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/bulk', async (req, res) => {
  const filter = req.query.filter || '';
  const id = req.body.id;
  const users = await User.find({
    $and: [
      {
        _id: { $ne: id }, // Exclude the currently logged-in user
      },
      {
        $or: [
          {
            firstName: { $regex: filter },
          },
          {
            lastName: { $regex: filter },
          },
        ],
      },
    ],
  });
  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
    })),
  });
});

module.exports = router;
