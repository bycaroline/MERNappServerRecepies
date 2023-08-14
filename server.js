require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const HttpError = require('./models/http-error')
const mongoose = require('mongoose')
const path = require('path')

const recipesRoutes = require('./routes/recipes-routes')
const usersRoutes = require('./routes/users-routes')

const app = express()

app.use(bodyParser.json()) // for parsing application/json
// app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'));

//create headers to handle CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE')
    next() //so that continue to other middleware
})

app.use('/api/recipes', recipesRoutes)//=>
app.use('/api/users', usersRoutes)

app.use((req, res, next) => {
    const error = new HttpError('Could not find route', 404)
    throw error // can use next if is async. Will lead us to the error handler below
})

app.use((error, req, res, next) => {

    if (res.headerSent) {
        return next(error)
    }
    res.status(error.code || 500)
    res.json({ message: error.message || 'Unknown error' })
})//if includes error will be treated as special middleware function, as an error handling middleware. 

mongoose
    .connect(process.env.DATABASE_URI)
    .then(() => {
        app.listen(process.env.PORT || 5000)
    })
    .catch(err => {
        console.log(err)
    })
