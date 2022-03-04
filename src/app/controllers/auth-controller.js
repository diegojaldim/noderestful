const bcryptjs = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const crypto = require('crypto');
const mailer = require('../../modules/mailer');

const router = express.Router();

function generateToken(params = {}) {
    return jwt.sign(params, process.env.JWT_SECRET, {
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

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send({ error: 'User not found' });    
        }

        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now,
            }
        });
        
        mailer.sendMail({
            to: email,
            from: 'diego.jaldim@gmail.com',
            template: 'auth/forgot-password',
            context: { token }
        }, (err) => {
            if (err) {
                console.log(err);
                return res.status(400).send({ error: 'Error on forgot password, try again' });
            }
        });

    } catch (error) {
        return res.status(400).send({ error: 'Error on forgot password' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, token, password } = req.body;

    try {
        const user = User.findOne({ email })
            .select(('+passwordResetToken passwordResetExpires'));

        if (!user) {
            return res.status(400).send({ error: 'User not found' });
        }

        if (token !== user.passwordResetToken) {
            return res.status(400).send({ error: 'Invalid token' });
        }

        const now = new Date();

        if (now > user.passwordResetExpires) {
            return res.status(400).send({ error: 'Token expired' });
        }

        user.password = password;

        await user.save();

        return res.send();
    } catch (error) {
        return res.status(400).send({ error: 'Error to reset password' });
    }

});

module.exports = app => app.use('/auth', router);