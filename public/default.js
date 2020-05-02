
(function () {

  WinJS.UI.processAll().then(function () {
    var myboard, myplayer, _ev_move, _ev_click, _ev_out, score_selected
    var socket, serverGame;
    var username, playerColor;
    var game, board;
    var usersOnline = [];
    var myGames = [];
    socket = io();

    //////////////////////////////
    // Socket.io handlers
    ////////////////////////////// 

    socket.on('login', function (msg) {
      usersOnline = msg.users;
      updateUserList();

      myGames = msg.games;
      updateGamesList();
    });

    socket.on('joinlobby', function (msg) {
      addUser(msg);
    });

    socket.on('leavelobby', function (msg) {
      removeUser(msg);
    });

    socket.on('gameadd', function (msg) {
    });

    socket.on('resign', function (msg) {
      if (msg.gameId == serverGame.id) {

        socket.emit('login', username);

        $('#page-lobby').show();
        $('#page-game').hide();
      }
    });

    socket.on('joingame', function (msg) {
      console.log("joined as game id: " + msg.game.id);
      playerColor = msg.color;
      initGame(msg.game, playerColor);

      $('#page-lobby').hide();
      $('#page-game').show();

    });

    socket.on('move', function (msg) {
      if (serverGame && msg.gameId === serverGame.id) {
        // game.move(msg.move);
        // board.position(game.fen());
        move_play(myplayer, msg.move.x, msg.move.y);
        enable_board();
      }
    });


    socket.on('logout', function (msg) {
      removeUser(msg.username);
    });



    //////////////////////////////
    // Menus
    ////////////////////////////// 
    $('#login').on('click', function () {
      username = $('#username').val();

      if (username.length > 0) {
        $('#userLabel').text(username);
        socket.emit('login', username);

        $('#page-login').hide();
        $('#page-lobby').show();
      }
    });

    $('#game-back').on('click', function () {
      socket.emit('login', username);

      $('#page-game').hide();
      $('#page-lobby').show();
    });

    $('#game-resign').on('click', function () {
      socket.emit('resign', { userId: username, gameId: serverGame.id });

      socket.emit('login', username);
      $('#page-game').hide();
      $('#page-lobby').show();
    });

    $('#game-score').on('click', function () {
      getScore();
    });

    var addUser = function (userId) {
      usersOnline.push(userId);
      updateUserList();
    };

    var removeUser = function (userId) {
      for (var i = 0; i < usersOnline.length; i++) {
        if (usersOnline[i] === userId) {
          usersOnline.splice(i, 1);
        }
      }

      updateUserList();
    };

    var updateGamesList = function () {
      document.getElementById('gamesList').innerHTML = '';
      myGames.forEach(function (game) {
        $('#gamesList').append($('<button>')
          .text('#' + game)
          .on('click', function () {
            socket.emit('resumegame', game);
          }));
      });
    };

    var updateUserList = function () {
      document.getElementById('userList').innerHTML = '';
      usersOnline.forEach(function (user) {
        $('#userList').append($('<button>')
          .text(user)
          .on('click', function () {
            socket.emit('invite', user);
          }));
      });
    };

    //////////////////////////////
    // Chess Game
    ////////////////////////////// 

    var initGame = function (serverGameState, playerColor) {
      serverGame = serverGameState;
      var elem = document.getElementById("game-board");
      // let hi = new WGo.Game();
      // WGo.Game = hi
      white = serverGame.users.white
      black = serverGame.users.black
      const _player = new WGo.BasicPlayer(elem, {
        sgf: "(;SZ[19]TM[60]KM[7.5]" + "PB[" + black + "]PW[" + white + "]",
        enableWheel: false
        // move: 1000	
      });
      myboard = _player.board
      myplayer = _player
      // 显示棋谱坐标
      myplayer.setCoordinates(!myplayer.coordinates);
      if (playerColor == 'black') {
        enable_board();
      }

      // game = serverGame.board ? new Chess(serverGame.board) : new Chess();
      // board = new ChessBoard('game-board', cfg);
    }



    //board mouse move event
    var edit_board_mouse_move = function (x, y) {
      if (myplayer.frozen || (this._lastX == x && this._lastY == y)) return;

      this._lastX = x;
      this._lastY = y;
      console.log("x value is " + x + ",y value is " + y)
      if (this._last_mark) {
        myboard.removeObject(this._last_mark);
      }

      if (x != -1 && y != -1 && myplayer.kifuReader.game.isValid(x, y)) {
        this._last_mark = {
          type: "outline",
          x: x,
          y: y,
          c: myplayer.kifuReader.game.turn
        };
        myboard.addObject(this._last_mark);
      }
      else {
        delete this._last_mark;
      }
    }

    //play a move
    var play = function (x, y) {
      // ignore invalid move
      if (myplayer.frozen || !myplayer.kifuReader.game.isValid(x, y)) return;

      var node;

      turn = myplayer.kifuReader.game.turn
      // create new node
      if (x == null) {
        node = new WGo.KNode({
          move: {
            pass: true,
            c: myplayer.kifuReader.game.turn
          },
          _edited: true
        });
      }
      else {
        node = new WGo.KNode({
          move: {
            x: x,
            y: y,
            c: myplayer.kifuReader.game.turn
          },
          _edited: true
        });
      }
      move = {
        x: x,
        y: y,
        c: myplayer.kifuReader.game.turn
      }
      // todo check what is board
      socket.emit('move', { move: move, gameId: serverGame.id });
      // socket.emit('move', { move: move, gameId: serverGame.id, board: game.fen() });

      // append new node to the current kifu
      myplayer.kifuReader.node.appendChild(node);

      // show next move
      myplayer.next(myplayer.kifuReader.node.children.length - 1);

      disable_board();
      play_audio();

    }

    //play a audio
    //TODO check if stone is dead
    var play_audio = function () {
      var audio = new Audio('static/move.mp3');
      audio.play();
    }

    var disable_board = function () {
      myboard.removeEventListener("click", _ev_click);
      myboard.removeEventListener("mousemove", _ev_move);
      myboard.removeEventListener("mouseout", _ev_out);
    }

    //enable board so it can play 
    var enable_board = function () {
      _ev_move = _ev_move || edit_board_mouse_move.bind(myboard);
      _ev_out = _ev_out || edit_board_mouse_out.bind(myboard);
      _ev_click = _ev_click || play.bind(myboard);
      myboard.addEventListener("mousemove", _ev_move);
      myboard.addEventListener("click", _ev_click);
      myboard.addEventListener("mouseout", _ev_out);
    }

    // board mouseout callback for edit move	
    var edit_board_mouse_out = function () {
      if (this._last_mark) {
        myboard.removeObject(this._last_mark);
        delete this._last_mark;
        delete this._lastX;
        delete this._lastY;
      }
    }
    // 显示分数
    function getScore() {
      if (score_selected) {
        myplayer.setFrozen(false);
        this._score_mode.end();
        delete this._score_mode;
        myplayer.notification();
        myplayer.help();
        score_selected = false;
      }
      else {
        myplayer.setFrozen(true);
        myplayer.help("<p>" + WGo.t("help_score") + "</p>");
        this._score_mode = new WGo.ScoreMode(myplayer.kifuReader.game.position, myplayer.board, myplayer.kifu.info.KM || 0.5, myplayer.notification);
        this._score_mode.start();
        score_selected = true;
      }
    }

    var move_play = function (player, x, y) {
      // ignore invalid move
      if (player.frozen || !player.kifuReader.game.isValid(x, y)) return;

      var node;

      // create new node
      if (x == null) {
        node = new WGo.KNode({
          move: {
            pass: true,
            c: player.kifuReader.game.turn
          },
          _edited: true
        });
      }
      else {
        node = new WGo.KNode({
          move: {
            x: x,
            y: y,
            c: player.kifuReader.game.turn
          },
          _edited: true
        });

        // append new node to the current kifu
        player.kifuReader.node.appendChild(node);

        // show next move
        player.next(player.kifuReader.node.children.length - 1);
        play_audio();
      }
    }
  });
})();

