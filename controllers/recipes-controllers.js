const { v4: uuidv4 } = require('uuid');
uuidv4();

const mongoose = require('mongoose')
const { validationResult } = require('express-validator')
const HttpError = require('../models/http-error')

const Recipe = require('../models/recipe')
// const User = require('../models/user');
const User = require('../models/User')
const Comment = require('../models/comment');
const Image = require('../models/image')

const { cloudinary } = require('../cloudinary/cloudinary.config')

const { storage } = require('../cloudinary/cloudinary.config')
const multer = require('multer')
const upload = multer({ storage })

//Order: Images, Recipes, Comments

//IMAGES
const addImage = async (req, res, next) => {
    console.log(req.body, req.file)

    const imageUploaded = new Image({
        url: req.file.path,
    })

    await imageUploaded.save()

    res.status(200).json({ message: 'image uploaded' })
}

const getImages = async (req, res, next) => {
    const images = await Image.find()

    res.json({ images: images })
}


const updateRecipeImage = async (req, res, next) => {
    const recipeId = req.params.rid
    // const recipeId = req.body

    let recipe;
    try {
        recipe = await Recipe.findById(recipeId)
    } catch (err) {
        const error = new HttpError('Could not update image for recipe', 500)
        return next(error)
    }

    if (recipe.creator.toString() !== req.userData.userId) { //to string since otherwise not equal
        const error = new HttpError('You are not authorized to update recipe', 401)
        return next(error)
    } //only if make it past this check the update can be made

    recipe.url = req.file.path

    try {
        await recipe.save()
    } catch (err) {
        const error = new HttpError('Could not update recipe', 500)
        return next(error)
    }

    res.status(200).json({ recipe: recipe.toObject({ getters: true }) }) //200 beacuse nothing new created
}


//RECIPES
const getAllRecipes = async (req, res, next) => {
    let recipesWithUser;

    try {
        recipesWithUser = await Recipe.find().sort({ _id: -1 }).populate({ path: 'creator', select: 'name' }).populate('comments')
    } catch (err) {
        const error = new HttpError(
            'Could not find all recipes', 500
        )
        return next(error)
    }

    res.json({ recipesWithUser: recipesWithUser.map(recipe => recipe.toObject({ getters: true })) });
}


const searchForRecipes = async (req, res) => {
    //looking for a query parameter "search"
    const { search } = req.query;
    let recipes;

    if (search) { // If search exists, the user typed in the search bar
        recipes = await Recipe.aggregate(
            [
                {
                    $search: {
                        index: "searchRecipes",
                        text: {
                            query: search,
                            path: {
                                wildcard: "*"
                            },
                            fuzzy: {}
                        }
                    }
                }
            ]
        );
    } else { // The search is empty so the value of "search" is undefined
        recipes = await Recipe.find();
    }
    return res.status(200).json({
        statusCode: 200,
        message: 'Fetched recipes',
        data: { recipes }
    });
}


const getPublicRecipes = async (req, res) => {
    const recipes = await Recipe.find().sort({ _id: -1 }).limit(3)

    if (!recipes?.length) {
        return res.status(400).json({ message: 'No public recipes found' })
    }
    res.json({ recipes: recipes })
}


const getRecipeById = async (req, res, next) => {
    const recipeId = req.params.rid// {rid:'r1'}

    let recipe; //so can access in if statement
    try {
        recipe = await Recipe.findById(recipeId)
        //does not return a promise 
        //but try catch is still available, mongoose spec. exec after can 
    }
    catch (err) {
        const error = new HttpError(
            'Error, Could not find a recipe', 500
        )
        return next(error)
    }

    if (!recipe) {
        const error = new HttpError(
            'Could not find a recipe', 500
        )
        return next(error)
    }
    res.json({ recipe: recipe.toObject({ getters: true }) }) // getting rid of underscore of id
}


const getRecipesByUserId = async (req, res, next) => {
    const userId = req.params.uid

    let userWithRecipes;
    try {
        userWithRecipes = await User.findById(userId).populate('recipes').populate('comments')
    } catch (err) {
        {
            const error = new HttpError(
                'Could not get recipes', 500
            )
            return next(error)
        }
    }

    if (!userWithRecipes || userWithRecipes.recipes.length === 0) {
        const error = new HttpError(
            'Could not find a recipe by that user', 500
        )
        return next(error)
    }

    res.json({ recipes: userWithRecipes.recipes.map(recipe => recipe.toObject({ getters: true })) })
}


const createRecipe = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        console.log(errors)
        return next(new HttpError('Invalid inputs for creating recipe', 422))
    }

    const { title, description } = req.body;

    const createdRecipe = new Recipe({
        title,
        description,
        creator: req.userData.userId,  //from the check-auth
        comments: [],
        url: req.file.path
    })

    let user;
    try {
        user = await User.findById(req.userData.userId)

    }
    catch (err) {
        const error = new HttpError('creating recipe failed', 500)
        return next(error)
    }

    if (!user) {
        const error = new HttpError('Could not find user for provided id', 404)
    }

    try {
        //recipe is created
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await createdRecipe.save({ session: sess })

        //recipeId added to user
        user.recipes.push(createdRecipe);
        await user.save({ session: sess, validateModifiedOnly: true });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('fail, please try again', 500)
        return next(error)//to stop execution if we have an error
    }

    // await createdRecipe.save()
    res.status(201).json({ recipe: createdRecipe })
}


const updateRecipe = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        console.log(errors)
        return next(new HttpError('Invalid inputs for updating recipe', 422))
    }

    const { title, description } = req.body //since we want to update the data for that rquest also need to be attached to the req
    const recipeId = req.params.rid

    let recipe;
    try {
        recipe = await Recipe.findById(recipeId)
    } catch (err) {
        const error = new HttpError('Could not update recipe', 500)
        return next(error)
    }

    if (recipe.creator.toString() !== req.userData.userId) { //to string since otherwise not equal
        const error = new HttpError('You are not authorized to update recipe', 401)
        return next(error)
    } //only if make it past this check the update can be made

    recipe.title = title
    recipe.description = description

    try {
        await recipe.save()
    } catch (err) {
        const error = new HttpError('Could not update recipe', 500)
        return next(error)
    }

    res.status(200).json({ recipe: recipe.toObject({ getters: true }) }) //200 beacuse nothing new created
}


const deleteRecipe = async (req, res, next) => {
    const recipeId = req.params.rid

    let recipe = await Recipe.findById(recipeId).populate('creator').populate('comments')

    if (recipe.creator.id.toString() !== req.userData.userId) { //to string since otherwise not equal
        const error = new HttpError('You are not authorized to delete recipe', 401)
        return next(error)
    }
    try {
        //recipe is created
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await recipe.deleteOne({ session: sess })

        recipe.creator.recipes.pull(recipe)
        await recipe.creator.save({ session: sess })

        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('', 500)
        return next(error)//to stop execution if we have an error
    }

    res.status(200).json({ message: 'deleted recipe' })
}

//COMMENTS

const addComment = async (req, res, next) => {
    const { text, recipeId } = req.body;

    const addedComment = new Comment({
        text,
        commentCreator: req.userData.userId,
        recipeComment: recipeId,
    })

    let recipe;
    try {
        recipe = await Recipe.findById(recipeId)

    }
    catch (err) {
        const error = new HttpError('creating comment failed', 500)
        return next(error)
    }

    if (!recipe) {
        const error = new HttpError('Could not find recipe for provided id', 404)
    }

    let user;
    try {
        user = await User.findById(req.userData.userId)

    }
    catch (err) {
        const error = new HttpError('creating comment failed', 500)
        return next(error)
    }

    if (!user) {
        const error = new HttpError('Could not find user for provided id', 404)
    }

    try {
        //comment is created
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await addedComment.save({ session: sess })

        //comment added to recipe
        recipe.comments.push(addedComment);
        await recipe.save({ session: sess, validateModifiedOnly: true });

        user.comments.push(addedComment);
        await user.save({ session: sess, validateModifiedOnly: true });

        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('fail to add comment to recipe', 500)
        return next(error)//to stop execution if we have an error
    }

    res.status(201).json({ comment: addedComment })

}

const getComments = async (req, res, next) => {
    let comments; //so can access in if
    try {
        comments = await Comment.find().populate('commentCreator').populate('recipeComment')

    }
    catch (err) {
        const error = new HttpError(
            'Error, Could not find a comment first', 500
        )
        return next(error)
    }

    if (!comments) {
        const error = new HttpError(
            'Could not find a comment second', 500
        )
        return next(error)
    }
    res.json({ comments: comments })
}


const deleteComment = async (req, res, next) => {
    const commentId = req.params.cid

    let comment;
    try {
        comment = await Comment.findById(commentId).populate('commentCreator').populate('recipeComment')
    }
    catch (err) {
        const error = new HttpError('Could not delete comment', 500)
        return next(error)
    }

    try {
        //recipe is created
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await comment.deleteOne({ session: sess })

        comment.recipeComment.comments.pull(comment)
        await comment.recipeComment.save({ session: sess })

        comment.commentCreator.comments.pull(comment) //id will automatically be removed as weel
        await comment.commentCreator.save({ session: sess })

        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError('transaction error for comment', 500)
        return next(error)
    }
    res.status(200).json({ message: 'Comment deleted' })
}


//IMAGES
exports.addImage = addImage
exports.getImages = getImages
exports.updateRecipeImage = updateRecipeImage

//RECIPES
exports.getRecipeById = getRecipeById
exports.getRecipesByUserId = getRecipesByUserId
exports.createRecipe = createRecipe
exports.updateRecipe = updateRecipe
exports.deleteRecipe = deleteRecipe
exports.getAllRecipes = getAllRecipes
exports.getPublicRecipes = getPublicRecipes
exports.searchForRecipes = searchForRecipes

//COMMENTS
exports.addComment = addComment
exports.deleteComment = deleteComment
exports.getComments = getComments
