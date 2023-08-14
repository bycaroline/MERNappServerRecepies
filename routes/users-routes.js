const express = require('express')
const { check } = require('express-validator')

const usersControllers = require('../controllers/users-controllers')

const router = express.Router()

router.get('/', usersControllers.getUsers)

router.post('/signup',
    [check('name')
        .not()
        .isEmpty(),
    check('password').isLength({ min: 5 })
    ], usersControllers.signup)

router.post('/login', usersControllers.login)

// router.delete('/:uid', usersControllers.deleteUser)

module.exports = router