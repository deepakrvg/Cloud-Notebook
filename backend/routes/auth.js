const { application } = require('express');
const express = require('express');
const User = require('../models/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var fetchuser = require('../middleware/fetchuser');

const JWT_SECRET = 'Secret$key';

// ROUTE 1: create a user using: POST "/api/auth/createuser". No login required
router.post('/createuser', [
    body('email', 'Enter a valid email').isEmail(),
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('password', 'password must be atleast 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    let success = false;
    // Error validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }

    // check whether the email already exists
    try {
        let user = await User.findOne({email: req.body.email});
        if (user) {
            return res.status(400).json({success, error: "Sorry a user with this email already exists"})
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);
        // create user
        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: secPass,
        });
        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET);
        // console.log(authtoken);

        // res.json(user)
        success = true
        res.json({success, authtoken})

    } catch(error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})

// ROUTE 2: authenticate a user using POST '/api/auth/login'. No login required
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists()
], async (req, res) => {
    let success = false;
    // check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {email, password} = req.body;
    try {
        let user = await User.findOne({email});
        if (!user) {
            success = false
            return res.status(400).json({error: "Invalid credentials"});
        }

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({error: "Invalid credentials"});
            success = false
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }

        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET);

        success = true;
        res.json({ success, authtoken })

    } catch(error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

});

// ROUTE 3: get user details using POST "/api/auth/getuser". Login required
router.post('/getuser', fetchuser, async (req, res) => {
    try {
        userId = req.user.id;
        const user = await User.findById(userId).select("-password")
        res.send(user);

    } catch(error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

});

module.exports = router