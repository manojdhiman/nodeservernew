var http = require('http');
var sio = require('socket.io');
var request = require("request");
server = http.createServer(handler);
server.listen(8080);
var server_base_url = "http://localhost/fleetno1";

var io = sio.listen(server, {
    log: false
});
//var io = sio.listen(server);
var clients = [];
io.sockets.on('connection', function(client) {
    client.on('message', function(msg) {

        if (typeof msg != 'undefined') {
            var type = msg.type;
            if (type == "connect") {
                var ar = {
                    userid: msg.user_id,
                    socket_id: client.id
                };
                clients.push(ar);
                var message = {
                    type: 'connect',
                    user_id: msg.user_id,
                    message: "User connected",
                    to_users: "",
                    socket_id: client.id
                };
                if (typeof client.id != 'undefined' && client.id != "") {
                    io.sockets.socket(client.id).emit('message', message);
                    io.sockets.emit('message', message);
                }
            } else if (type == "notification" || type == "message" || type == "comment" || type == 'friendrequest') {
                if (typeof msg.type != 'undefined' && typeof msg.user_id != 'undefined' && typeof msg.to_users != 'undefined') {
                    var tousers = msg.to_users.toString();
                    if (type == "has_inastant_booking") {
                        var url = server_base_url + "/api/customers/has_instant_booking/user_id/" + msg.user_id;
                        request(url, function(error, response, body) {
                            var body_data = JSON.parse(body);
                            msg_to_send(tousers, msg, clients, body_data);

                        });
                    } else {
                        msg_to_send(tousers, msg, clients, "");
                    }
                }
            }
        }

    });

    client.on('disconnect', function() {

        for (x in clients) {
            if (clients[x].socket_id == client.id) {
                var user_id = clients[x].userid;
                var socket_id = clients[x].socket_id;
                clients.splice(x, 1);
                var has_logged = check_has_user(clients, user_id);

                if (has_logged == false) {
                    var msg = {
                        type: 'disconnect',
                        user_id: user_id,
                        message: "User disconnected",
                        to_users: "",
                        socket_id: socket_id
                    };
                    io.sockets.emit('message', msg);
                }
            }
        }

    });



});


function msg_to_send(tousers, msg, clients, body) {
    var arr_users = tousers.split(",");
    var arr = [];
    for (flag = 0; flag < arr_users.length; flag++) {
        arr.push(parseInt(arr_users[flag]));
    }
    if (body != "") {


        var booking_info = body.booking_info;

        for (a in booking_info) {
            msg[a] = booking_info[a];
        }
        var driver_cab_info = body.driver_cab_info;
        for (b in driver_cab_info) {
            msg[b] = driver_cab_info[b];
        }

    }
    console.log(clients);
    for (x in clients) {
        var index = arr.indexOf(clients[x].userid); // if index > -1

        if (index > -1) {
            var socket_id = clients[x].socket_id;
            if (typeof socket_id != 'undefined' && socket_id != "") {
                io.sockets.socket(socket_id).emit('message', msg);
            }
        }

    }
}

function check_has_user(clients, user_id) {
    for (x in clients) {
        if (clients[x].userid == user_id) {
            return true;
        }
    }
    return false;
}

function handler(req, res) {
    switch (req.url) {
        case '/push':

            if (req.method == 'POST') {

                var fullBody = '';
                req.on('data', function(chunk) {
                    fullBody += chunk.toString();

                    if (fullBody.length > 1e6) {
                        req.connection.destroy();
                    }
                });
                req.on('end', function() {
                    var msg = JSON.parse(fullBody);

                    if (typeof msg.type != 'undefined' && typeof msg.user_id != 'undefined' && typeof msg.to_users != 'undefined') {
                        var tousers = msg.to_users.toString();
                        var type = msg.type;

                        if (type == "notification" || type == "message" || type == "comment" || type == "friendrequest") {

                            if (type == "has_inastant_booking") {
                                var url = server_base_url + "/api/customers/has_instant_booking/user_id/" + msg.user_id;
                                request(url, function(error, response, body) {

                                    var body_data = JSON.parse(body);

                                    msg_to_send(tousers, msg, clients, body_data);

                                });
                            } else {

                                msg_to_send(tousers, msg, clients, "");
                            }

                        }

                    }
                    res.end();
                });
            }

            break;

        default:
            // Null
    };
}
