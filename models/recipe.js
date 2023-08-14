const mongoose = require('mongoose')
let Comment = require('./comment')

const Schema = mongoose.Schema

const recipeSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },

    creator: {
        type: mongoose.Types.ObjectId,
        required: true,
        // User is  the reference
        ref: 'User'
    },
    comments: [{
        type: mongoose.Types.ObjectId,
        ref: 'Comment'
    }],
    //image:
    url: {
        type: String
    }
})



recipeSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        await Comment.deleteMany({
            "_id": {
                $in: this.comments
            }
        });
        next();
    } catch (err) {
        next(err)
    }
})


module.exports = mongoose.model('Recipe', recipeSchema)