//jshint esversion:6
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook");
// bcrypt
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// mongoose encryption
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"],
// });

const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://27ff-78-63-25-127.ngrok.io/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.CLIENT_ID_FB,
      clientSecret: process.env.CLIENT_SECRET_FB,
      callbackURL: "https://27ff-78-63-25-127.ngrok.io/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  User.find({ secrets: { $ne: null } }, function (err, foundUsers) {
    if (err) return console.log(err);
    if (foundUsers) {
      res.render("secrets", { usersWithSecrets: foundUsers });
    }
  });
});

app.post("/submit", function (req, res) {
  const submittedMessage = req.body.secret;

  User.findById(req.user.id, function (err, foundUser) {
    if (err) return console.log(err);
    if (foundUser) {
      foundUser.secret = submittedMessage;
      foundUser.save(function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/submit", function (req, res) {
  if (!req.isAuthenticated()) return res.redirect("/login");

  res.render("submit");
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        return res.redirect("/register");
      }

      req.login(user, function (err) {
        if (err) return res.redirect("/login");

        res.redirect("/secrets");
      });
    }
  );
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/secrets",
  })
);

// app.post("/login", function (req, res) {
//   const user = new User({
//     username: req.body.username,
//     password: req.body.password,
//   });
//   req.login(user, function (err) {
//     if (err) return console.log(err);
//     passport.authenticate("local")(req, res, function () {
//       res.redirect("/secrets");
//     });
//   });
// });

app.listen(3000, function () {
  console.log("server is running");
});

// bcrypt app.post (register)
// bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
//   const newUser = new User({
//     email: req.body.username,
//     password: hash,
//   });

//   newUser.save(function (err) {
//     if (err) {
//       return res.send(err);
//     }
//     res.render("secrets");
//   });
// });

// bcrypt app.post (login)
// const userLogEmail = req.body.username;
//   const userLogPass = req.body.password;

//   User.findOne({ email: userLogEmail }, function (err, foundUser) {
//     if (err) return console.log(err);
//     if (!foundUser) return console.log("Wrong username");
//     // if (userLogPass !== foundUser.password) return console.log("Wrong pass");
//     bcrypt.compare(userLogPass, foundUser.password, function (err, result) {
//       if (result === true) return res.render("secrets");
//     });
//   });
