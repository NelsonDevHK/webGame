const express = require("express");

const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");

// Create the Express app
const app = express();

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// Use the session middleware to maintain sessions
const chatSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 } // 5mins
});
app.use(chatSession);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// Handle the /register endpoint
app.post("/register", (req, res) => {
    // Get the JSON data from the body
    const { username, avatar, name, password } = req.body;

    //
    // D. Reading the users.json file 
    //
    const users = JSON.parse(fs.readFileSync('./data/users.json','utf8'));
    console.log(users);
    //
    // E. Checking for the user data correctness
    //
    if (!username || !avatar || !name || !password) {
         return res.json({ status: "error", error: "All fields are required." });
    }

    if (!containWordCharsOnly(username)) {
        return res.json({ status: "error", error: "Username can only contain letters, numbers, and underscores." });
    }
    
    if (username in users) {
        return res.json({ status: "error", error: "Username already exists." });
    }
    //
    // G. Adding the new user account
    //
    const hashpw = bcrypt.hashSync(password,10);

    //put into users
    users[username] = {
        avatar,
        name,
        password: hashpw
    };

    // H. Saving the users.json file
    const usersJSON = JSON.stringify(users, null, 2);
    fs.writeFileSync('./data/users.json', usersJSON); // hardcode path

    //
    // I. Sending a success response to the browser
    res.json({ 
        status: "success",
        user: { username, avatar, name } 
    });
});

// Handle the /signin endpoint
app.post("/signin", (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const usersRaw = fs.readFileSync('./data/users.json', 'utf8');
    users = JSON.parse(usersRaw);

    if (!username || !password) {
        return res.json({ status: "error", error: "Username and password are required." });
    }

    if (!(username in users)) {
        return res.json({ status: "error", error: "Invalid username or password." });
    }

    const user = users[username];
    if (!bcrypt.compareSync(password, user.password)) {
        return res.json({ status: "error", error: "Invalid username or password." });
    }
    // Store user info in session (without password)
    req.session.user = {
        username,
        avatar: user.avatar,
        name: user.name
    };

    // G. Sending a success response with the user account (without password)
    res.json({
        status: "success",
        user: req.session.user
    });
});

// Handle the /validate endpoint
app.get("/validate", (req, res) => {

    const user = req.session.user;

    if (user) {
        res.json({ status: "success", user });
    } else {
        res.json({ status: "error", error: "No user signed in." });
    }
 
    // Delete when appropriate
    // res.json({ status: "error", error: "This endpoint is not yet implemented." });
});

// Handle the /signout endpoint
app.get("/signout", (req, res) => {

    //
    // Deleting req.session.user
    //
    req.session.user = null;

    req.session.destroy();

    // Sending a success response
    res.json({ status: "success" });
 
});


//
// ***** Please insert your Lab 6 code here *****
//


// Use a web server to listen at port 8000
app.listen(8000, () => {
    console.log("The chat server has started...");
});
