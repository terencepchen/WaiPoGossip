// MongoDB User Model

var mongoose = require('mongoose');

module.exports = mongoose.model('User', {
    username: String,
    password: String,
    first_name: String,
    last_name: String,
    language_modules: [{type: String, ref: 'LanguageModule'}]
});
