var http = require('http');
var pg = require('pg');
var url = require('url');
var simpleRouter = require('node-simple-router');
var util = require('util');

var router = simpleRouter();
var conString = "postgres://postgres_user:password@localhost:5432/my_postgres_db";
var client = new pg.Client(conString);
client.connect();

var write_response = function (response, code, body) {
  response.writeHead(code, {"Content-Type": "text/plain"});
  response.end(body + '\n');
}

router.post("/log", function (request, response) {
  var jam_list = request.body.jam_list;

  if (typeof(jam_list) === 'undefined') {
    write_response(response, 400, "bad request");
    return;
  }

  var jam_list_len = jam_list.length;
  var error = false;
  var jams_processed = 0;

  for (var i = 0; i < jam_list_len; ++i) {

    var jam = jam_list[i];

    if (error) {
      write_response(response, 500, "error processing jam");
      break;
    }

    var jam_length = jam.length;
    var jam_num_users = jam.num_users;
    var jam_num_songs = jam.num_songs;
    var jam_start_time = jam.start_time;
    
    if (typeof(jam_length) === 'undefined' 
        || typeof(jam_num_users) === 'undefined' 
        || typeof(jam_num_songs) === 'undefined'
        || typeof(jam_start_time) === 'undefined') {
      console.log("bad request -- jam length, num users, or num songs is missing from jam in jam_list\n");
      write_response(response, 400, "bad request");
      return;
    }

    client.query("INSERT INTO log (length, num_users, num_songs, start_time) VALUES ($1, $2, $3, $4)",
      [jam_length, jam_num_users, jam_num_songs, jam_start_time],
      function(err, result) {
        if (err) {
          error = true;

          console.log("error logging jams");
          console.log(err);
          write_response(response, 500, "error processing jam");
        }
        else {
          if (!error) {
            ++jams_processed;
            if (jams_processed == jam_list_len) {
              write_response(response, 200, "OK");
            }
          }
        }
    });
  }

});

var server = http.createServer(router);

server.listen(80);
