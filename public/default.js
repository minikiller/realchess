
(function () {

  WinJS.UI.processAll().then(function () {
    var myboard, myplayer, _ev_move, _ev_click, _ev_out, score_selected, isView = false
    var socket, serverGame;
    var username, playerColor;
    var game, board;
    var usersOnline = [];
    var myGames = [];
    //buttons and inputs
    var message = $("#message");
    var send_message = $("#send_message");
    var chatroom = $("#chatroom");
    var feedback = $("#feedback")
    var total_time = 60 * 5;
    var black_time = total_time;
    var white_time = total_time;

    socket = io();


    //////////////////////////////
    // Socket.io handlers
    ////////////////////////////// 

    socket.on('login', function (msg) {
      usersOnline = msg.users;
      updateUserList();

      myGames = msg.games;
      updateGamesList();

      allGames = msg.allgames;
      updateAllGamesList();
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
        if (myplayer.kifuReader.node.move.c == 1) {
          game_over("白中盘胜");
        }
        else {
          game_over("黑中盘胜");
        }
        socket.emit('login', username);

        // $('#page-lobby').show();
        // $('#page-game').hide();
      }
    });

    socket.on('joingame', function (msg) {
      console.log("joined as game id: " + msg.game.id);
      playerColor = msg.color;
      game = msg.game;
      initGame(msg.game, playerColor);
      document.getElementById('room').innerHTML = 'room id: ' + msg.game.id;
      $('#page-lobby').hide();
      $('#page-game').show();

    });

    socket.on('viewgame', function (msg) {
      console.log("viewed as game id: " + msg.game.id);
      game = msg.game;
      document.getElementById('room').innerHTML = 'room id: ' + msg.game.id;
      // playerColor = msg.color;
      initViewGame(msg.game);

      $('#page-lobby').hide();
      $('#page-game').show();

    });

    socket.on('move', function (msg) {
      if (serverGame && msg.gameId === serverGame.id) {
        // game.move(msg.move);
        // board.position(game.fen());
        black_time = msg.BL;
        white_time = msg.WL;
        move_play(myplayer, msg.move.x, msg.move.y);
        // if (!isView)
        enable_board();
      }
    });


    socket.on('logout', function (msg) {
      removeUser(msg.username);
    });

    //Listen on new_message
    socket.on('get_message', function (data) {
      if (serverGame && data.gameId === serverGame.id) {
        feedback.html('');
        message.val('');
        chatroom.append("<p class='message'>" + data.username + ": " + data.message + "</p>")
      }
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
      if (myplayer.kifuReader.node.move.c == 1) {
        game_over("白中盘胜");
      }
      else {
        game_over("黑中盘胜");
      }
      // game_over("resign");
      // $('#page-game').hide();
      // $('#page-lobby').show();
    });

    $('#send_message').on('click', function () {
      value = message.val();
      console.log('get ' + value)

      socket.emit('new_message', { message: message.val(), gameId: serverGame.id })
      feedback.html('');
      message.val('');
      chatroom.append("<p class='message'>" + username + ": " + value + "</p>")
    });

    $('#game-score').on('click', function () {
      getScore();
    });

    $('#game-kifu').on('click', function () {
      alert(myplayer.kifu.toSgf());
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
    //allGamesList

    var updateAllGamesList = function () {
      document.getElementById('allGamesList').innerHTML = '';
      allGames.forEach(function (game) {
        $('#allGamesList').append($('<button>')
          .text('#' + game)
          .on('click', function () {
            socket.emit('viewgame', { gameId: game, userId: username });
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
    var initViewGame = function (serverGameState) {
      serverGame = serverGameState;
      var elem = document.getElementById("game-board");
      // let hi = new WGo.Game();
      // WGo.Game = hi
      white = serverGame.users.white
      black = serverGame.users.black
      const _player = new WGo.BasicPlayer(elem, {
        sgf: serverGame.kifu,
        enableWheel: false,
        enableKeys: false,
        move: 1000
      });
      myboard = _player.board
      myplayer = _player
      // 显示棋谱坐标
      // myplayer.setCoordinates(!myplayer.coordinates);
      isView = true;
      // game = serverGame.board ? new Chess(serverGame.board) : new Chess();
      // board = new ChessBoard('game-board', cfg);
    }

    var initGame = function (serverGameState, playerColor) {
      serverGame = serverGameState;
      var elem = document.getElementById("game-board");
      // let hi = new WGo.Game();
      // WGo.Game = hi
      white = serverGame.users.white
      black = serverGame.users.black

      const _player = new WGo.BasicPlayer(elem, {
        sgf: "(;SZ[19]TM[" + total_time + "]KM[7.5]" + "PB[" + black + "]PW[" + white + "]",
        enableWheel: false,
        enableKeys: false
        // move: 1000	
      });
      myboard = _player.board
      myplayer = _player

      // storage for move markers 棋子上显示数字
      /**
      var number_markers = [];

      myplayer.addEventListener("update", function (e) {
        // this function will be executed after every move

        var marker;
        if (e.path.m < number_markers.length) {
          // remove old move numbers
          for (var i = e.path.m; i < number_markers.length; i++) {
            myplayer.board.removeObject(number_markers[i]);
          }
          number_markers.splice(e.path.m);
        }
        else if (e.node.move && !e.node.move.pass) {
          // add current move marker
          marker = { x: e.node.move.x, y: e.node.move.y, type: "LB", text: e.path.m };
          number_markers.push(marker);
          myplayer.board.addObject(marker);
        }
      });**/

      // 显示棋谱坐标
      // myplayer.setCoordinates(!myplayer.coordinates);
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
      // console.log("x value is " + x + ",y value is " + y)
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

      // create new node
      if (x == null) {
        node = new WGo.KNode({
          move: {
            pass: true,
            c: myplayer.kifuReader.game.turn
          },
          BL: black_time,
          WL: white_time,
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
          BL: black_time,
          WL: white_time,
          _edited: true
        });
      }
      move = {
        x: x,
        y: y,
        c: myplayer.kifuReader.game.turn
      }
      // socket.emit('move', { move: move, gameId: serverGame.id, board: game.fen() });

      // append new node to the current kifu
      myplayer.kifuReader.node.appendChild(node);

      // show next move
      myplayer.next(myplayer.kifuReader.node.children.length - 1);
      // todo check what is board
      var data = {
        move: move,
        gameId: serverGame.id,
        kifu: myplayer.kifu.toSgf(),
        BL: black_time,
        WL: white_time,
      };
      socket.emit('move', data);

      disable_board();
      read_time();
      // play_audio();

    }

    //play a audio
    //TODO check if stone is dead
    //TODO 用时解决
    //TODO timer
    var play_audio = function () {
      var audio = new Audio('static/move.mp3');
      audio.play();
    }

    var disable_board = function () {
      score = document.getElementById("game-score");
      score.disabled = true
      myboard.removeEventListener("click", _ev_click);
      myboard.removeEventListener("mousemove", _ev_move);
      myboard.removeEventListener("mouseout", _ev_out);
    }

    //enable board so it can play 
    var enable_board = function () {
      var last_steps = myplayer.kifuReader.path.m;
      var turn = last_steps % 4;

      if (turn == 1 && username == game.users.white) { //black
        add_event();
      }
      if (turn == 2 && username == game.users.black0) { //black
        add_event();
      }
      if (turn == 3 && username == game.users.white0) { //black
        add_event();
      }
      if (turn == 0 && username == game.users.black) { //black
        add_event();
      }

    }
    var add_event = function () {
      score = document.getElementById("game-score");
      score.disabled = false
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

    var timer_loop = null; //定时器
    var read_time = function () {
      // console.log("your turn value is " + turn);
      clearTimeout(timer_loop);
      if (myplayer.kifuReader.node.move.c == -1) {
        timer_loop = setInterval(function () {
          black_time -= 1
          myplayer.kifuReader.node.BL = black_time;

          myplayer.update();
          if (myplayer.kifuReader.node.BL == 0) {


            game_over("白超时胜")
            // game.game_over = true;
            // game.info.innerHTML = 'GAME OVER';
            // game.info.className = '';
          }
        }, 1000);
      }
      else {
        timer_loop = setInterval(function () {
          white_time -= 1
          myplayer.kifuReader.node.WL = white_time;

          myplayer.update();
          if (myplayer.kifuReader.node.WL == 0) {

            game_over("黑超时胜")
            // game.game_over = true;
            // game.info.innerHTML = 'GAME OVER';
            // game.info.className = '';
          }
        }, 1000);
      }

      // myplayer.update();
    }

    var game_over = function (result) {
      clearTimeout(timer_loop);
      node = new WGo.KNode({
        RE: result
      });
      // append new node to the current kifu
      myplayer.kifuReader.node.appendChild(node);

      myplayer.kifu.info['RE'] = result;
      // myplayer.kifu.info['BL'] = black_time;
      // myplayer.kifu.info['WL'] = white_time;
      myplayer.loadSgf(myplayer.kifu.toSgf(), 1000);
      myplayer.kifuReader.node.WL = white_time;
      myplayer.kifuReader.node.BL = black_time;

      myplayer.update();
      alert(result);
      $("#result").append("<h3>" + result + "</h3>")
      console.log(myplayer.kifu.toSgf())
      console.log('info is ' + myplayer.kifu.info)

      disable_board();
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
          BL: black_time,
          WL: white_time,
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
          BL: black_time,
          WL: white_time,
          _edited: true
        });

        // append new node to the current kifu
        player.kifuReader.node.appendChild(node);

        // show next move
        player.next(player.kifuReader.node.children.length - 1);
        read_time();
        // play_audio();
      }
    }
  });
})();

