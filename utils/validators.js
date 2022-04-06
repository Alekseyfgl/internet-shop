const {body} = require('express-validator')
const User = require("../models/user");

exports.registerValidators = [
    body('email')
        .isEmail()
        .withMessage('введеный email должен быть минимум 2 символа и на EN')
        .custom(async (value, {req}) => {
            try {
                const candidate = await User.findOne({email: value})
                // console.log(candidate)

                if (candidate) {
                    return Promise.reject('Такой email уже занят')
                }
            } catch (e) {
                console.log(e)
            }
        })
        .trim(),

    body('password', 'Пароль должен быть минимум 2 символов').isLength({min: 2, max: 56}).isAlphanumeric(),
    body('confirm').custom((value, {req}) => {
        // console.log(value)
        if (value !== req.body.password) {
            throw new Error('Пароли должны совпадать');
        }
        return true
    }),
    body('name')
        .isLength({min: 2})
        .withMessage('Имя должно быть не менее 2 символов')
        .trim(),
]



exports.courseValidators = [
    body('title').isLength({min: 3}).withMessage('Минимальная длинна названия 3 символа').trim(),
    body('price').isNumeric().withMessage('Введите корректную цену'),
    body('img').isLength({min:5}).trim().withMessage('Слишком коротко для URL :)')
]