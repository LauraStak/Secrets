//jshint esversion:6
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

console.log(process.env.API_KEY);
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

userSchema.plugin(encrypt, {
  secret: process.env.SECRET,
  encryptedFields: ["password"],
});

const User = mongoose.model("User", userSchema);

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password,
  });

  newUser.save(function (err) {
    if (err) {
      return res.send(err);
    }
    res.render("secrets");
  });
});

app.post("/login", function (req, res) {
  const userLogEmail = req.body.username;
  const userLogPass = req.body.password;

  User.findOne({ email: userLogEmail }, function (err, foundUser) {
    if (err) return console.log(err);
    if (!foundUser) return console.log("Wrong username");
    if (userLogPass !== foundUser.password) return console.log("Wrong pass");
    if (userLogPass === foundUser.password) return res.render("secrets");
  });
});

app.listen(3000, function () {
  console.log("server is running");
});
