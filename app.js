const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running At http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Register API
app.post("/register/", async (request, response) => {
  const userDetails = request.body;
  const { username, password, name, gender } = userDetails;
  const hashedPassword = await bcrypt.hash(password, 10);
  const isExistsQuery = `SELECT * FROM user;`;
  const dbResponse = await db.get(isExistsQuery);

  if (dbResponse === undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createNewUSer = `INSERT INTO user (username,password,name,gender) VALUES("${username}","${hashedPassword}","${name}","${gender}");`;
      const newUser = await db.run(createNewUSer);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

// Login API
app.post("/login/", async (request, response) => {
  const userLoginDetails = request.body;
  const { username, password } = userLoginDetails;

  const isUserExists = `SELECT * FROM user WHERE username = "${username}"`;
  const dbResponse = await db.get(isUserExists);
  if (dbResponse === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbResponse.password
    );
    if (isPasswordMatched === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "efkjfjrfrjjfjrfjr");
      response.send({ jwtToken: jwtToken });
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[0];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "efkjfjrfrjjfjrfjr", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// API-3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const userTweets = `SELECT username,tweet.tweet,date_time AS dateTime FROM user INNER JOIN tweet ON user.user_id LIMIT 4`;
  const dbResponse = await db.all(userTweets);
  response.send(dbResponse);
});

module.exports = app;
