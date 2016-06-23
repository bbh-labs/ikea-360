var process = require('process');
var port = process.env.PORT || 8080;

var express = require('express');
var app = express();

app.use(express.static('.'));

app.listen(port, function() {
	console.log('Serving at port', port);
});
