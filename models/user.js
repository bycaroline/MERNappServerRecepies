const mongoose = require('mongoose')

const Schema = mongoose.Schema

const userSchema = new Schema({

    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    recipes:
        //array since one user can have several recipes
        [{
            type: mongoose.Types.ObjectId,
            // User is  the reference
            ref: 'Recipe'
        }],
    comments: [{
        type: mongoose.Types.ObjectId,
        ref: 'Comment'
    }],
})


module.exports =
    mongoose.models.User || mongoose.model('User', userSchema);

