const bcryptjs = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const authConfig = require('../../config/auth.json');

const router = express.Router();

function generateToken(params = {}) {
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400
    });
}

router.post('/register', async (req, res) => {
    try {
        const { email } = req.body;

        if (await User.findOne({ email })) {
            return res.status(400)
                .send({ error: 'User already exists' });
        }

        const user = await User.create(req.body);
        
        user.password = undefined;

        return res.send({
            user,
            token: generateToken({id: user.id})
        });
    } catch (error) {
        return res.status(400)
            .send({error: 'Error registration failed'});
    }
});

router.post('/authenticate', async (req, res) => {
    const {
        email,
        password,
    } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(400).send({ error: 'User not found' });
    }

    if (!await bcryptjs.compare(password, user.password)) {
        return res.status(400).send({ error: 'Invalid password' });
    }

    user.password = undefined;

    res.status(200).send({ 
        user, 
        token: generateToken({id: user.id})
    });
});

module.exports = app => app.use('/auth', router);