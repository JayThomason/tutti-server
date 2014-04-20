var http = require('http');
var pg = require('pg');
var url = require('url');
var simpleRouter = require ('node-simple-router');

var router = simpleRouter();
var conString = "postgres://postgres_user:password@localhost:5432/my_postgres_db";
var client = new pg.Client(conString);
client.connect();

router.get("/createJam", function (request, response) {
  var url_parts = url.parse(request.url, true);
  var privateIpAddr = url_parts.query.private;

  client.query("INSERT INTO jams (public_ip, private_ip) VALUES ($1, $2)",
    [request.connection.remoteAddress, privateIpAddr], 
    function(err, result) {
      if(err) {
        response.writeHead(400, {"Content-Type": "text/plain"});
        response.end("INTERNAL SERVER ERROR\n");
        console.log("error creating jam: " + request.connection.remoteAddress + " " + privateIpAddr);
      }
      else {
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.end("OK\n");
        console.log("created jam: " + request.connection.remoteAddress + " " + privateIpAddr);
      }
  });
});

router.get("/discoverJams", function (request, response) {
  var rows = [];

  var query = client.query("SELECT * FROM jams WHERE public_ip = $1",
    [request.connection.remoteAddress]);

  query.on('error', function() {
    response.writeHead(400, {"Content-Type": "text/plain"});
    response.end("INTERNAL SERVER ERROR\n");
    console.log("error discovering jams");
  });
  
  query.on('row', function(row) {
    rows.push(row);
  });

  query.on('end', function() {
    response.writeHead(200, {"Content-Type": "text/plain"});
    for (var i = 0; i < rows.length; ++i)
      response.write(rows[i].private_ip + "\n");
    response.end();
  });
});

var server = http.createServer(router);
server.listen(80);
