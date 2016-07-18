// Copyright 2016 Nathaniel Chen

var express = require('express');
var fs = require('fs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var bodyparser = require('body-parser');
var cookieparser = require('cookie-parser');
var expressSession = require('express-session');
var User = require('./mongodb_User.js');

//MongoDB
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/language');
var mongo = mongoose.connection;
mongo.on('error', console.error.bind(console, 'connection error:'));
//connecting
mongo.once('open', function(callback) {
    console.log('Connected to mongodb');
});

//Middleware
var app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyparser());
app.use(cookieparser());
app.use(expressSession({
    secret: 'thisisthesessionsecret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var hit_counter = 0;

//Passport Strategies
passport.use('login', new LocalStrategy(login_strategy));
function login_strategy(username, password, done) {
    User.findOne({username: username}, function(error, user) {
        if (user) {
            //Success
            if (password == user.password) {
                console.log(user.username + ' authenticated');
                return done(null, user);
            } else {
                console.warn('Wrong password');
                return done(null, false, {message: 'Wrong password'});
            }
        } else {
            console.warn('User not found');
            return done(null, null, {message: 'User not found'});
        }
        if (error) {
            console.error(error);
            return done(error);
        }
    });
}

//Serialize: pass small part of user object for identity
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(error, user) {
        done(null, user);
    });
});

function check_authenticated(request, response, next) {
    if (request.isAuthenticated()) {
        //Don't go to the register page if logged in
        if (request.route.path === '/register') {
            response.redirect('/');
        } else {
            return next();
        }
    } else {
        if (request.route.path === '/register') {
            return next();
        } else {
            response.redirect('/login');
        }
    }
}

function register_user(request, response, next) {
    console.log('creating new user ' + request.body.username);
    User.findOne({username: request.body.username}, function(error, user) {
        if (error) {
            console.warn(error);
            return next(error);
        }
        //User already exists
        if (user) {
            console.log('User already exists');
            //TODO tell the client
            response.redirect('/register');
        } else {
            //Create new user
            var newuser = new User();
            newuser.username = request.body.username;
            newuser.password = request.body.password;
            newuser.save(function(error, newuser) {
                if (error) {
                    return console.error(error);
                }
                console.log('Created new user ' + newuser.username);
                return next();
            });
        }
    });
}

app.get('/', check_authenticated, function(request, response) {
    response.render('index', {
        isAuthenticated: request.isAuthenticated(),
        user: request.user
    });
});

app.get('/register', check_authenticated, function(request, response) {
    response.render('register', {
        isAuthenticated: request.isAuthenticated(),
        user: request.user
    });
});

app.post('/register', register_user, function(request, response) {
    console.log('Created new user ' + request.body.username);
    response.redirect('/');
});

app.get('/login', function(request, response) {
    hit_counter++;
    console.log(hit_counter + " accidental visitors since last server reset");
    response.render('login');
});

app.post('/login', passport.authenticate('login', {failureRedirect: '/login'}), function(request, response) {
    response.redirect('/');
});

app.get('/logout', function(request, response) {
    request.logout();
    response.redirect('/login');
});

var server = app.listen(9000, function() {
    console.log('Server running on port ' + server.address().port);
});
