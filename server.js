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
  var private_ip = url_parts.query.private;
  var public_ip = request.connection.remoteAddress;
  var name = url_parts.query.name;
  var ssid = url_parts.query.ssid;
  var gateway = url_parts.query.gateway;
  var query_string = "INSERT INTO jams (public_ip, private_ip, name) VALUES ($1, $2, $3)";

  if (typeof private_ip === 'undefined') {
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
    name = "Jam-" + private_ip;
  }

  var query_values = [public_ip, private_ip, name];

  if (typeof gateway !== 'undefined' && typeof ssid !== 'undefined') {
    query_string = "INSERT INTO jams (public_ip, private_ip, name, ssid, gateway_ip) VALUES ($1, $2, $3, $4, $5)";
    query_values = [public_ip, private_ip, name, ssid, gateway];
  }

  client.query(query_string, query_values,
    function(err, result) {
      if (err) {
        if (err.message.substring(0, constants.jam_already_exists.length) === constants.jam_already_exists) {
          client.query("UPDATE jams SET name = $1 WHERE public_ip = $2 AND private_ip = $3",
            [name, public_ip, private_ip],
            function(err, result) {
              if (err) {
                console.log("Error renaming jam.\n");
                console.log(err);
                write_response(response, 500, "Internal Server Error\n");
              }
              else {
                write_response(response, 200, "OK\n");
                console.log("renamed jam: " + name + " " + public_ip + " " + private_ip);
              }
            });
        }
        else {
          write_response(response, 500, "Internal Server Error\n");
          console.log("error creating jam: " + public_ip + " " + private_ip);
          console.log("\t " + query_string + query_values);
        }
      }
      else {
        write_response(response, 200, "OK\n");
        console.log("created jam: " + name + " " + public_ip + " " + private_ip);
      }
  });
});

router.get("/discoverJams", function (request, response) {
  var url_parts = url.parse(request.url, true);
  var ssid = url_parts.query.ssid;
  var gateway = url_parts.query.gateway;
  var rows = [];

  if (typeof gateway === 'undefined' || typeof ssid == 'undefined') {
    write_response(response, 400, "Bad request: gateway and ssid are required.");
    return;
  }
  
  var query = client.query("SELECT * FROM jams WHERE ssid = $1 AND gateway_ip = $2", 
    [ssid, gateway]);

  query.on('error', function() {
    write_response(response, 500, "Internal Server Error\n");
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
