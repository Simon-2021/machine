var express = require("express");
var http = require("http");
var bodyParser = require('body-parser')
var logger = require('morgan');
var path = require('path');
var index = require('./routes/index');

var app = express();

app.set("views",__dirname+"/views");
// app.set("view engine","ejs");
app.engine("html",require("ejs").__express);
app.set('view engine', 'html');

app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api',index);


// app.get('/', (req, res) => {
//     res.render('index', {});
// });

// app.post('/login', (req, res) => {
//     var name = req.body.username;
//     var pwd = req.body.password;
//     if(name == "hnu" && pwd == "123456"){
//         res.render('task', {name: name})
//     }
// });


app.listen(4100, function(){
    console.log("The machine-server of gp is created at the port of 4100.");
});

module.exports = app;