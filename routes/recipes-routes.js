const express = require('express')
const { check } = require('express-validator')
const checkAuth = require('../middleware/check-auth')

const recipesControllers = require('../controllers/recipes-controllers')

const { storage } = require('../cloudinary/cloudinary.config')
const multer = require('multer')
const upload = multer({ storage })

const router = express.Router()

router.get('/public', recipesControllers.getPublicRecipes)

router.get('/searchfor', recipesControllers.searchForRecipes)
router.get('/comments', recipesControllers.getComments)
router.get('/image', recipesControllers.getImages)
router.get('/', recipesControllers.getAllRecipes)
router.get('/:rid', recipesControllers.getRecipeById)
router.get('/user/:uid', recipesControllers.getRecipesByUserId)

router.use(checkAuth)

router.post('/',
    upload.single('image'),
    [
        check('title')
            .not()
            .isEmpty(),
        check('description')
            .isLength({ min: 5 })
    ],
    recipesControllers.createRecipe)


router.patch('/:rid',
    upload.single('image'),
    [
        check('title')
            .not()
            .isEmpty(),
        check('description')
            .isLength({ min: 5 })
    ]
    , recipesControllers.updateRecipe) //does not clash with get route

router.patch('/:rid/image', upload.single('image'), recipesControllers.updateRecipeImage)


router.post('/:rid/comments', recipesControllers.addComment)

router.delete('/comments/:cid', recipesControllers.deleteComment)

router.delete('/:rid', recipesControllers.deleteRecipe)

module.exports = router