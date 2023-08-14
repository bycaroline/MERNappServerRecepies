const mongoose = require('mongoose')


const Schema = mongoose.Schema

const commentSchema = new Schema({

    text: {
        type: String,
        trim: true,
        required: true
    },
    commentCreator: {
        type: mongoose.Types.ObjectId,
        // User is  the reference
        ref: 'User'
    },
    recipeComment: {
        type: mongoose.Types.ObjectId,
        // User is  the reference
        ref: 'Recipe'
    },
})


module.exports = mongoose.model('Comment', commentSchema)