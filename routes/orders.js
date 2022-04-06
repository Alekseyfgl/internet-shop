const {Router} = require('express')
const Order = require('../models/order')
const auth = require('../middleware/auth')
const router = Router()

router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({'user.userId': req.user._id})
            .populate('user.userId', 'email name')
            // .lean()
            // .select('email name')
        // .lean()
        // await orders = JSON.stringify(JSON.parse(orders))
        // console.log(orders)
        // const x =  JSON.stringify(orders)
        // console.log(x)
        // const y = [
        // {
        //     "user": {
        //         "name": "AlexQw",
        //         "userId": {
        //             "cart": {"items": []},
        //             "_id": "6249bfb328205182d9334d6f",
        //             "email": "aleksey.fgl@gmail.com",
        //             "name": "AlexQw",
        //             "password": "$2a$10$01fhv4.Q7GoSC5W6ig3Z/.mgK1CfPWJtUcKL0eestLpuG2KXZ8lt2",
        //             "__v": 2
        //         }
        //     },
        //
        //     "_id": "6249c3fed28b9dc5456a1ecc",
        //
        //     "courses": [{
        //         "course": {
        //             "_id": "6249c3f3d28b9dc5456a1eb4",
        //             "title": "node",
        //             "price": 10,
        //             "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/1280px-Node.js_logo.svg.png",
        //             "userId": "6249bfb328205182d9334d6f",
        //             "__v": 0
        //         }, "count": 1, "_id": "6249c3fed28b9dc5456a1ecd"
        //     }],
        //
        //
        //     "date": "2022-04-03T15:57:50.819Z",
        //     "__v": 0
        // }]

        // const z = {
        //     cart: {items: []},
        //     _id: new ObjectId("6249bfb328205182d9334d6f"),
        //     email: 'aleksey.fgl@gmail.com',
        //     name: 'AlexQw',
        //     password: '$2a$10$01fhv4.Q7GoSC5W6ig3Z/.mgK1CfPWJtUcKL0eestLpuG2KXZ8lt2',
        //     __v: 4
        // }

        res.render('orders', {
            isOrder: true,
            title: 'Заказы',
            orders: orders.map(o => {
                return {
                    ...o._doc,
                    price: o.courses.reduce((total, c) => {
                        return total += c.count * c.course.price
                    }, 0)
                }
            })
        })
    } catch (e) {
        console.log(e)
    }
})


router.post('/', auth, async (req, res) => {
    try {
        const user = await req.user
            .populate('cart.items.courseId')


        const courses = user.cart.items.map(i => ({
            count: i.count,
            course: {...i.courseId._doc}
        }))

        const order = new Order({
            user: {
                name: req.user.name,
                userId: req.user
            },
            courses: courses
        })

        // console.log(order)

        await order.save()
        await req.user.clearCart()

        res.redirect('/orders')
    } catch (e) {
        console.log(e)
    }
})

module.exports = router