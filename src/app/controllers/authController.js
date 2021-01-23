const express = require('express');
const route = express.Router()
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authConfig = require('../../config/auth.json');
const { randomBytes } = require('crypto');
const mailer = require('../../modules/mailer')

const User = require('../models/User');

function generateToken(params) {
    console.log(params)
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400,
    })
}

route.post('/register', async (req, res) => {
    try {
        const { email } = req.body;

        if (await User.findOne({ email })) {
            return res.status(400).send({ error: 'User already exist' })
        }
        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({
            user,
            token: generateToken({ id: user._id })
        })

    } catch (err) {
        return res.status(400).send({ error: 'Registration failed' });
    }
})

route.post('/authenticate', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).send({ error: 'User not found!' })
        }

        if (!await bcrypt.compareSync(password, user.password)) {
            return res.status(400).send({ error: 'Invalid password ' })
        }

        user.password = undefined;

        res.send({
            user,
            token: generateToken({ id: user._id })
        });

    } catch (err) {
        return res.status(400).send({ error: 'Error failed' });
    }

})

route.post('/forgot-password', async (req, res) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).send({ error: 'User not found' })
        }

        const token = randomBytes(20).toString('hex');

        const now = new Date()
        now.setHours(now.getHours() + 1)

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now
            }
        })

        mailer.sendMail({
            to: email,
            from: 'huandrey.pontes@ccc.ufcg.edu.br',
            template: '/auth/forgot_password',
            context: { token },

        }, (err) => {
            if (err) {
                console.log('ESSE EH O ERRO' + err)
                return res.status(400).send({ error: 'Cannot send forgot password email' })
            }
            return res.send('ok')
        })

    } catch (err) {
        console.log(err)
        return res.status(400).send({ error: 'Error on forgot password, try again' })
    }
})

route.post('/reset-password', async (req, res) => {
    const { email, token, password } = req.body;

    try {

        const user = await User.findOne({ email })
            .select('+passwordResetToken passwordResetExpires');

        if (!user)
            return res.status(400).send({ error: 'User not found' })

        if (token !== user.passwordResetToken)
            return res.status(400).send({ error: 'Invalid Token' })

        const now = new Date()

        if (now > user.passwordResetExpires)
            return res.status(400).send({ error: 'Token expired, generate a new one' })


        user.password = password;

        await user.save()

        res.send('Password modified')
    } catch (err) {
        res.status(401).send({ error: '' })
    }
})

module.exports = app => app.use('/auth', route)