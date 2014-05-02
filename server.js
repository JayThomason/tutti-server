var http = require('http');
var pg = require('pg');
var url = require('url');
var simpleRouter = require('node-simple-router');
var util = require('util');

var router = simpleRouter();
var conString = "postgres://postgres_user:password@localhost:5432/my_postgres_db";
var client = new pg.Client(conString);
client.connect();

var constants = {
  'jam_already_exists': 'duplicate key value violates unique constraint'
}

var write_response = function (response, code, body) {
  response.writeHead(code, {"Content-Type": "text/plain"});
  response.end(body);
}

router.get("/createJam", function (request, response) {
  var url_parts = url.parse(request.url, true);
  var privateIpAddr = url_parts.query.private;
  var name = url_parts.query.name;
  var query_string = "INSERT INTO jams (public_ip, private_ip, name) VALUES ($1, $2, $3)";

  if (typeof privateIpAddr === 'undefined') {
    write_response(response, 400, "BAD REQUEST: private ip address required\n");
    console.log("bad request: no private ip address");
    return;
  }

  if (typeof name !== 'undefined' && name.indexOf(" ") > -1) {
    write_response(response, 400, "BAD REQUEST: name connot contain spaces\n");
    console.log("bad request: bad name");
    return;
  }

  if (typeof name === 'undefined') {
    name = "Jam-" + privateIpAddr;
  }

  var query_values = [request.connection.remoteAddress, privateIpAddr, name];

  client.query(query_string, query_values,
    function(err, result) {
      if (err) {
        if (err.message.substring(0, constants.jam_already_exists.length) === constants.jam_already_exists) {
          write_response(response, 200, "Jam Already Exists");
          console.log("jam already exists: " + name + " " + request.connection.remoteAddress + " " + privateIpAddr);
        }
        else {
          write_response(response, 500, "Internal Server Error\n");
          console.log("error creating jam: " + request.connection.remoteAddress + " " + privateIpAddr);
          console.log("\t " + query_string + query_values);
        }
      }
      else {
        write_response(response, 200, "OK\n");
        console.log("created jam: " + name + " " + request.connection.remoteAddress + " " + privateIpAddr);
      }
  });
});

router.get("/discoverJams", function (request, response) {
  var rows = [];

//  var query = client.query("SELECT * FROM jams WHERE public_ip = $1",
//    [request.connection.remoteAddress]);
  
  var query = client.query("SELECT * FROM jams", []);

  query.on('error', function() {
    write_response(response, 400, "Internal Server Error\n");
    console.log("error discovering jams");
  });
  
  query.on('row', function(row) {
    rows.push(row);
  });

  query.on('end', function() {
    response.writeHead(200, {"Content-Type": "text/plain"});
    for (var i = 0; i < rows.length; ++i) {
      response.write(rows[i].name + " " + rows[i].private_ip + "\n");
    }
    response.end();
  });
});

var server = http.createServer(router);
server.listen(80);
