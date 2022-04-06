const {Router} = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const {validationResult} = require('express-validator')
const nodemailer = require('nodemailer')
const sendgrid = require('nodemailer-sendgrid-transport')
const User = require('../models/user')
const keys = require('../keys')
const regEmail = require('../emails/registration')
const resetEmail = require('../emails/reset')
const {registerValidators} = require('../utils/validators')
const router = Router()

const transporter = nodemailer.createTransport(sendgrid({
    auth: {api_key: keys.SENDGRID_API_KEY}
}))

router.get('/login', async (req, res) => {
    res.render('auth/login', {
        title: 'Авторизация',
        isLogin: true,
        loginError: req.flash('loginError'),
        registerError: req.flash('registerError')
    })
})

router.get('/logout', async (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login#login')
    })
})

//login IN
router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body
        const candidate = await User.findOne({email}).lean()

        if (candidate) {
            const areSame = await bcrypt.compare(password, candidate.password)

            if (areSame) {
                req.session.user = candidate
                req.session.isAuthenticated = true
                req.session.save(err => {
                    if (err) {
                        throw err
                    }
                    res.redirect('/')
                })
            } else {
                req.flash('loginError', 'Неверный пароль')
                res.redirect('/auth/login#login')
            }
        } else {
            req.flash('loginError', 'Такого пользователя не существует')
            res.redirect('/auth/login#login')
        }
    } catch (e) {
        console.log(e)
    }
})

//наша регистрация
router.post('/register', registerValidators, async (req, res) => {
    try {
        //форма которую мы отправвляем
        const {email, password, name} = req.body

        //ищем пользователя в базе данных с тем емейлом который отправляли
        // const candidate = await User.findOne({email}).lean()

        const errors = validationResult(req)
        //если что-то в ошибках есть мы должны показать сообщение человеку
        if (!errors.isEmpty()) {
            //вытаскиваем сообщение с ошибкой
            req.flash('registerError', errors.array()[0].msg)
            return res.status(422).redirect('/auth/login#register')
        }

        // if (candidate) {
        //     req.flash('registerError', 'Пользователь с таким email уже существует')
        //     res.redirect('/auth/login#register')
        // } else {
        //     const hashPassword = await bcrypt.hash(password, 10)
        //     const user = new User({
        //         email, name, password: hashPassword, cart: {items: []}
        //     })
        //     await user.save()
        //     // await transporter.sendMail(regEmail(email))
        //     res.redirect('/auth/login#login')
        // }


        const hashPassword = await bcrypt.hash(password, 10)
        const user = new User({
            email, name, password: hashPassword, cart: {items: []}
        })
        await user.save()
        await transporter.sendMail(regEmail(email))
        res.redirect('/auth/login#login')
    } catch (e) {
        console.log(e)
    }
})

router.get('/reset', (req, res) => {
    res.render('auth/reset', {
        title: 'Забыли пароль?',
        error: req.flash('error')
    })
})

router.get('/password/:token', async (req, res) => {
    if (!req.params.token) {
        return res.redirect('/auth/login')
    }

    try {
        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExp: {$gt: Date.now()}
        }).lean()

        if (!user) {
            return res.redirect('/auth/login')
        } else {
            res.render('auth/password', {
                title: 'Восстановить доступ',
                error: req.flash('error'),
                userId: user._id.toString(),
                token: req.params.token
            })
        }
    } catch (e) {
        console.log(e)
    }

})

router.post('/reset', (req, res) => {
    try {
        crypto.randomBytes(32, async (err, buffer) => {
            if (err) {
                req.flash('error', 'Что-то пошло не так, повторите попытку позже')
                return res.redirect('/auth/reset')
            }

            const token = buffer.toString('hex')
            const user = await User.findOne({email: req.body.email}).lean()

            console.log(user)

            if (user) {
                user.resetToken = token
                user.resetTokenExp = Date.now() + 60 * 60 * 1000
                await user.save()
                await transporter.sendMail(resetEmail(user.email, token))
                res.redirect('/auth/login')
            } else {
                req.flash('error', 'Такого email нет')
                res.redirect('/auth/reset')
            }
        })
    } catch (e) {
        console.log(e)
    }
})

router.post('/password', async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.body.userId,
            resetToken: req.body.token,
            resetTokenExp: {$gt: Date.now()}
        }).lean()

        if (user) {
            user.password = await bcrypt.hash(req.body.password, 10)
            user.resetToken = undefined
            user.resetTokenExp = undefined
            await user.save()
            res.redirect('/auth/login')
        } else {
            req.flash('loginError', 'Время жизни токена истекло')
            res.redirect('/auth/login')
        }
    } catch (e) {
        console.log(e)
    }
})

module.exports = router