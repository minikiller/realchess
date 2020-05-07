var express = require('express');
var app = express();
var fs = require('fs')
app.use(express.static('public'));
app.use(express.static('dashboard'));
var http = require('http').Server(app);


var io = require('socket.io')(http);

var port = process.env.PORT || 3000;

var lobbyUsers = {};
var users = {};
var activeGames = {};
var allGames = {};

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/default.html');

});

app.get('/dashboard/', function (req, res) {
    res.sendFile(__dirname + '/dashboard/dashboard.html');
});

function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    str += " "
    return str;
}

io.on('connection', function (socket) {
    console.log(getFormattedDate() + 'new connection ' + socket);

    socket.on('login', function (userId) {
        doLogin(socket, userId);
    });

    function doLogin(socket, userId) {
        socket.userId = userId;

        if (!users[userId]) {
            console.log(getFormattedDate() + 'creating new user ' + userId);
            users[userId] = { userId: socket.userId, games: {} };
        } else {
            console.log('user found!');
            Object.keys(users[userId].games).forEach(function (gameId) {
                console.log(getFormattedDate() + 'gameid - ' + gameId);
            });
        }

        socket.emit('login', {
            users: Object.keys(lobbyUsers),
            games: Object.keys(users[userId].games),
            allgames: Object.keys(allGames)
        });
        lobbyUsers[userId] = socket;

        socket.broadcast.emit('joinlobby', socket.userId);
    }

    socket.on('invite', function (opponentId) {
        console.log(getFormattedDate() + 'got an invite from: ' + socket.userId + ' --> ' + opponentId);

        socket.broadcast.emit('leavelobby', socket.userId);
        socket.broadcast.emit('leavelobby', opponentId);


        var game = {
            id: Math.floor((Math.random() * 100) + 1),
            board: null,
            users: { white: socket.userId, black: opponentId, white0: 0, black0: 0 },
            kifu: null
        };

        socket.gameId = game.id;
        activeGames[game.id] = game;
        allGames[game.id] = game;

        users[game.users.white].games[game.id] = game.id;
        users[game.users.black].games[game.id] = game.id;

        console.log(getFormattedDate() + 'starting game: ' + game.id);
        lobbyUsers[game.users.white].emit('joingame', { game: game, color: 'white' });
        lobbyUsers[game.users.black].emit('joingame', { game: game, color: 'black' });

        delete lobbyUsers[game.users.white];
        delete lobbyUsers[game.users.black];

        socket.broadcast.emit('gameadd', { gameId: game.id, gameState: game });
    });

    socket.on('viewgame', function (msg) {
        console.log(getFormattedDate() + 'ready to view game: ' + msg.gameId);

        socket.gameId = msg.gameId;
        var game = activeGames[msg.gameId];
        if (game.users.black0 == 0) {
            game.users.black0 = socket.userId
        } else if (game.users.white0 == 0) {
            game.users.white0 = socket.userId
        }
        console.log(getFormattedDate() + 'begin to view game: ' + msg.gameId);
        lobbyUsers[msg.userId].emit('viewgame', { game: game });

    });

    socket.on('resumegame', function (gameId) {
        console.log(getFormattedDate() + 'ready to resume game: ' + gameId);

        socket.gameId = gameId;
        var game = activeGames[gameId];

        users[game.users.white].games[game.id] = game.id;
        users[game.users.black].games[game.id] = game.id;

        console.log(getFormattedDate() + 'resuming game: ' + game.id);
        if (lobbyUsers[game.users.white]) {
            lobbyUsers[game.users.white].emit('joingame', { game: game, color: 'white' });
            delete lobbyUsers[game.users.white];
        }

        if (lobbyUsers[game.users.black]) {
            lobbyUsers[game.users.black] &&
                lobbyUsers[game.users.black].emit('joingame', { game: game, color: 'black' });
            delete lobbyUsers[game.users.black];
        }
    });

    socket.on('move', function (msg) {
        socket.broadcast.emit('move', msg);
        // activeGames[msg.gameId].board = msg.board;
        activeGames[msg.gameId].kifu = msg.kifu;
        // allGames[msg.gameId].kifu = msg.kifu;
        console.log(getFormattedDate() + 'move data is ' + msg.move);
        console.log(getFormattedDate() + 'kifu data is ' + msg.kifu);

    });

    socket.on('resign', function (msg) {
        console.log(getFormattedDate() + "resign: " + msg);

        delete users[activeGames[msg.gameId].users.white].games[msg.gameId];
        delete users[activeGames[msg.gameId].users.black].games[msg.gameId];
        delete activeGames[msg.gameId];

        socket.broadcast.emit('resign', msg);
    });

    //listen on new_message
    socket.on('new_message', function (data) {
        console.log(getFormattedDate() + 'chat message received!' + data.message
            + " user id is: " + socket.userId);
        // lobbyUsers[socket.userId].emit('get_message', { message: data.message, username: socket.userId });
        socket.broadcast.emit('get_message', { message: data.message, username: socket.userId, gameId: data.gameId });
    });

    socket.on('disconnect', function (msg) {

        console.log(msg);

        if (socket && socket.userId && socket.gameId) {
            console.log(getFormattedDate() + 'user: ' + socket.userId + ' disconnected');
            console.log(getFormattedDate() + 'game id: ' + socket.gameId + ' disconnected');
        }

        delete lobbyUsers[socket.userId];

        socket.broadcast.emit('logout', {
            userId: socket.userId,
            gameId: socket.gameId
        });
    });

});

http.listen(port, function() {
    console.log('listening on *: ' + port);
});

//   https.createServer({
//     key: fs.readFileSync('server.key'),
//     cert: fs.readFileSync('server.cert')
//   }, app).listen(port, function () {
//     console.log(getFormattedDate() + 'listening on *: ' + port);
// });