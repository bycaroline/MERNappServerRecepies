
const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/http-error')
const User = require('../models/User')


const getUsers = async (req, res, next) => {
    // const users { name, role } = req.body
    let users;
    try {
        users = await User.find().select('-password')
    } catch (err) {
        const error = new HttpError('Could not get users', 500)
        return next(error)
    }
    res.json({ users: users.map(user => user.toObject({ getters: true })) });
}


const signup = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs', 422)
        )
    }
    const { name, password } = req.body

    let existingUser;
    try {
        existingUser = await User.findOne({ name: name })
    } catch (err) {
        const error = new HttpError('Signup failed', 500)
        return next(error)
    }

    if (existingUser) {
        const error = new HttpError('Name already in use', 422)
        return next(error)
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12)
    } catch (err) {
        const error = new HttpError(
            'could not create user', 500
        )
        return next(error)
    }


    const createdUser = new User({
        name,
        password: hashedPassword,
        // starting recipe is an empty array
        recipes: [],
        comments: []
    })

    try {
        await createdUser.save()
    } catch (err) {
        const error = new HttpError('failed to signup', 500)
        return next(error)//to stop execution if we have an error
    }

    let token;
    try {
        token = jwt.sign({
            userId: createdUser.id,
            name: createdUser.name
        }, process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' })
    }
    catch (err) {
        const error = new HttpError('signup failed', 500)
        return next(error)
    }


    res.status(201).json({
        userId: createdUser.id,
        name: createdUser.name,
        token: token
    })
}

const login = async (req, res, next) => {
    const { name, password } = req.body

    let existingUser;
    try {
        existingUser = await User.findOne({ name: name })
    } catch (err) {
        const error = new HttpError('Logging in failed', 500)
        return next(error)
    }

    if (!existingUser) {
        const error = new HttpError('Invalid credentials, login failed', 401)
        return next(error)
    }

    let isValidPassword = false
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password)//exsitingUser.password is the hashed password
    } catch (err) {
        const error = new HttpError('Could not log you in, please check credentials and try again', 500)
        return next(error)
    }

    if (!isValidPassword) {
        const error = new HttpError('Invalid credentials, login failed', 401)
        return next(error)
    }

    let token;
    try {
        token = jwt.sign({
            userId: existingUser.id,
            name: existingUser.name
        }, process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' })
    }
    catch (err) {
        const error = new HttpError('logging in failed', 500)
        return next(error)
    }


    res.status(201).json({
        userId: existingUser.id,
        name: existingUser.name,
        token: token
    })


}

// const deleteUser = async (req, res, next) => {
//     const userId = req.params.uid

//     let user = await User.findById(userId).populate('recipes').populate('comments')

//     user.deleteOne()

//     res.status(200).json({ message: 'user deleted' })

// }


// exports.deleteUser = deleteUser
exports.getUsers = getUsers
exports.signup = signup
exports.login = login

