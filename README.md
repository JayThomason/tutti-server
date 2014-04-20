tutti-server
============

This is a fairly basic node.js + postgres setup to allow for primitive jam discovery in [Tutti](https://github.com/JayThomason/tutti). It lets Android devices running Tutti to discover each other if they are on the same local network by providing a mapping from public to private IP addresses. 

We assume that the phones running Tutti are behind the same NAT, therefore they should all have the same public ip addresses when making requests to tutti-server.

Setup
------
tutti-server runs on Amazon EC2 and requires node, npm, and postgres. Install node or postgres first and then install the the async node postgres bindings [node-postgres](https://github.com/brianc/node-postgres), and [node-simple-router](https://github.com/sandy98/node-simple-router) using npm.

API
-----
There are only two methods in the API at this point, discoverJams and createJam.

#### GET /createJam?private={privateIpAddr}
Should only be called by the master phone when it is creating a new jam. privateIpAddr should be the private ip address of the master phone on the local wifi network. Creates a mapping between the master phone's public and private ip addresses.

Returns 200 on success and 400 on database or server error.

Note that right now there is no duplicate detection so if you continually call 

#### GET /discoverJams
Called by client phones when attempting to discover local jams. Returns a list of all the private ip addresses of master phones hosting jams on the same network (with a matching public ip for the client phone). 

Returns a 200 on success and 400 on database or server error.
