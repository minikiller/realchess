(function () {
  WinJS.UI.processAll().then(function () {
    var myboard,
      myplayer,
      _ev_move,
      _ev_click,
      _ev_out,
      score_selected,
      isView = false;
    var socket, serverGame;
    var username, playerColor;
    var game, board;
    var usersOnline = [];
    var myGames = [];
    //buttons and inputs
    var message = $("#message");
    var send_message = $("#send_message");
    var chatroom = $("#chatroom");
    var feedback = $("#feedback");
    var total_time = 60 * 5;
    var black_time = total_time;
    var white_time = total_time;
    var white, black;
    socket = io.connect("/");
    // socket = io.connect('https://localhost:3000', { secure: true });
    var connection = new RTCMultiConnection();

    //////////////////////////////
    // Socket.io handlers
    //////////////////////////////

    socket.on("login", function (msg) {
      usersOnline = msg.users;
      updateUserList();

      myGames = msg.games;
      updateGamesList();

      allGames = msg.allgames;
      updateAllGamesList();
    });

    socket.on("joinlobby", function (msg) {
      addUser(msg);
    });

    socket.on("leavelobby", function (msg) {
      removeUser(msg);
    });

    socket.on("gameadd", function (msg) {});

    socket.on("resign", function (msg) {
      if (msg.gameId == serverGame.id) {
        if (myplayer.kifuReader.node.move.c == 1) {
          game_over("白中盘胜");
        } else {
          game_over("黑中盘胜");
        }
        socket.emit("login", username);

        // $('#page-lobby').show();
        // $('#page-game').hide();
      }
    });

    socket.on("joingame", function (msg) {
      console.log("joined as game id: " + msg.game.id);
      playerColor = msg.color;
      game = msg.game;
      initGame(msg.game, playerColor);
      renderRoom(msg);
      // $('#page-lobby').hide();
      // $('#page-game').show();
      console.log(123);
      // by default, socket.io server is assumed to be deployed on your own URL
      // connection.socketURL = 'http://localhost:9001/';

      // comment-out below line if you do not have your own socket.io server
      // connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';
      // connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';
      connection.socketURL = "https://bibiweiqi.com:9001/";
      connection.userid = username;

      connection.socketMessageEvent = "video-conference-demo";

      connection.session = {
        audio: true,
        video: true,
        data: true,
      };
      connection.videosContainer = document.getElementById("videos-container");
      connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true,
      };
      // https://www.rtcmulticonnection.org/docs/iceServers/
      // use your own TURN-server here!
      connection.iceServers = [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun.l.google.com:19302?transport=udp",
          ],
        },
      ];
      connection.onstream = function (event) {
        {
          var existing = document.getElementById(event.streamid);
          if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
          }

          event.mediaElement.removeAttribute("src");
          event.mediaElement.removeAttribute("srcObject");
          event.mediaElement.muted = true;
          event.mediaElement.volume = 0;

          var video = document.createElement("video");

          try {
            video.setAttributeNode(document.createAttribute("autoplay"));
            video.setAttributeNode(document.createAttribute("playsinline"));
          } catch (e) {
            video.setAttribute("autoplay", true);
            video.setAttribute("playsinline", true);
          }

          if (event.type === "local") {
            video.volume = 0;
            try {
              video.setAttributeNode(document.createAttribute("muted"));
            } catch (e) {
              video.setAttribute("muted", true);
            }
          }
          video.srcObject = event.stream;

          var width = parseInt(connection.videosContainer.clientWidth / 3) - 20;
          var mediaElement = getHTMLMediaElement(video, {
            // title: username,
            title: event.userid,
            buttons: ["full-screen"],
            width: width,
            showOnMouseEnter: false,
          });

          connection.videosContainer.appendChild(mediaElement);

          setTimeout(function () {
            mediaElement.media.play();
          }, 5000);

          mediaElement.id = event.streamid;

          // to keep room-id in cache
          localStorage.setItem(
            connection.socketMessageEvent,
            connection.sessionid
          );

          chkRecordConference.parentNode.style.display = "none";

          if (chkRecordConference.checked === true) {
            btnStopRecording.style.display = "inline-block";
            recordingStatus.style.display = "inline-block";

            var recorder = connection.recorder;
            if (!recorder) {
              recorder = RecordRTC([event.stream], {
                type: "video",
              });
              recorder.startRecording();
              connection.recorder = recorder;
            } else {
              recorder.getInternalRecorder().addStreams([event.stream]);
            }

            if (!connection.recorder.streams) {
              connection.recorder.streams = [];
            }

            connection.recorder.streams.push(event.stream);
            recordingStatus.innerHTML =
              "Recording " + connection.recorder.streams.length + " streams";
          }

          if (event.type === "local") {
            connection.socket.on("disconnect", function () {
              if (!connection.getAllParticipants().length) {
                location.reload();
              }
            });
          }
        }
      };
      connection.mediaConstraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 320,
            maxWidth: 320,
            minHeight: 180,
            maxHeight: 180,
          },
          optional: [],
        },
      };
      connection.openOrJoin(msg.game.id);
      $("#page-lobby").hide();
      $("#page-game").css("visibility", "visible");
    });

    socket.on("joingame", function (msg) {
      console.log("joined as game id: " + msg.game.id);
      playerColor = msg.color;
      game = msg.game;
      initGame(msg.game, playerColor);
      renderRoom(msg);
      // $('#page-lobby').hide();
      // $('#page-game').show();
      $("#page-lobby").hide();
      $("#page-game").css("visibility", "visible");
    });

    socket.on("viewgame", function (msg) {
      console.log("viewed as game id: " + msg.game.id);
      game = msg.game;

      // playerColor = msg.color;
      initViewGame(msg.game);
      renderRoom(msg);
      $("#page-lobby").hide();
      $("#page-game").css("visibility", "visible");
    });

    socket.on("move", function (msg) {
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

    socket.on("logout", function (msg) {
      removeUser(msg.username);
    });

    //Listen on new_message
    socket.on("get_message", function (data) {
      if (serverGame && data.gameId === serverGame.id) {
        feedback.html("");
        message.val("");
        chatroom.append(
          "<p class='message'>" + data.username + ": " + data.message + "</p>"
        );
      }
    });

    //////////////////////////////
    // Menus
    //////////////////////////////
    $("#game-join").on("click", function () {
      connection.openOrJoin("public-room", (isRoomJoined, roomid, error) => {
        console.log(isRoomJoined, roomid, error);
      });
    });

    $("#login").on("click", function () {
      username = $("#username").val();

      if (username.length > 0) {
        $("#userLabel").text(username);
        socket.emit("login", username);

        $("#page-login").hide();
        $("#page-lobby").show();
        // $('#page-login').css("visibility", "hidden");
        // $('#page-lobby').css("visibility", "visible");
      }
    });

    $("#game-back").on("click", function () {
      socket.emit("login", username);

      $("#page-game").hide();
      $("#page-lobby").show();
    });

    $("#game-resign").on("click", function () {
      socket.emit("resign", { userId: username, gameId: serverGame.id });

      socket.emit("login", username);
      if (myplayer.kifuReader.node.move.c == 1) {
        game_over("白中盘胜");
      } else {
        game_over("黑中盘胜");
      }
      // game_over("resign");
      // $('#page-game').hide();
      // $('#page-lobby').show();
    });

    $("#send_message").on("click", function () {
      value = message.val();
      console.log("get " + value);

      socket.emit("new_message", {
        message: message.val(),
        gameId: serverGame.id,
      });
      feedback.html("");
      message.val("");
      chatroom.append("<p class='message'>" + username + ": " + value + "</p>");
    });

    $("#game-score").on("click", function () {
      getScore();
    });

    $("#game-kifu").on("click", function () {
      alert(myplayer.kifu.toSgf());
    });

    $("#game-info").on("click", function () {
      set_info();
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
      document.getElementById("gamesList").innerHTML = "";
      myGames.forEach(function (game) {
        $("#gamesList").append(
          $("<button>")
            .text("#" + game)
            .on("click", function () {
              socket.emit("resumegame", game);
            })
        );
      });
    };
    //allGamesList

    var updateAllGamesList = function () {
      document.getElementById("allGamesList").innerHTML = "";
      allGames.forEach(function (game) {
        $("#allGamesList").append(
          $("<button>")
            .text("#" + game)
            .on("click", function () {
              socket.emit("viewgame", { gameId: game, userId: username });
            })
        );
      });
    };

    var updateUserList = function () {
      document.getElementById("userList").innerHTML = "";
      usersOnline.forEach(function (user) {
        $("#userList").append(
          $("<button>")
            .text(user)
            .on("click", function () {
              socket.emit("invite", user);
            })
        );
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
      white = serverGame.users.white;
      black = serverGame.users.black;
      if (!serverGame.kifu) {
        g_kifu =
          "(;SZ[19]TM[" +
          total_time +
          "]KM[7.5]" +
          "PB[" +
          black +
          "]PW[" +
          white +
          "]";
      } else {
        g_kifu = serverGame.kifu;
      }
      const _player = new WGo.BasicPlayer(elem, {
        sgf: g_kifu,
        enableWheel: false,
        enableKeys: false,
        move: 1000,
      });
      myboard = _player.board;
      myplayer = _player;
      // 显示棋谱坐标
      // myplayer.setCoordinates(!myplayer.coordinates);
      isView = true;
    };

    var renderRoom = function (msg) {
      document.getElementById("room").innerHTML =
        "<h2>room id: " + msg.game.id + ", username is " + username + "</h2>";
    };

    var initGame = function (serverGameState, playerColor) {
      serverGame = serverGameState;
      var elem = document.getElementById("game-board");
      // let hi = new WGo.Game();
      // WGo.Game = hi
      white = serverGame.users.white;
      black = serverGame.users.black;
      g_kifu =
        "(;SZ[19]TM[" +
        total_time +
        "]KM[7.5]" +
        "PB[" +
        black +
        "]PW[" +
        white +
        "]";
      const _player = new WGo.BasicPlayer(elem, {
        sgf: g_kifu,
        enableWheel: false,
        enableKeys: false,
        // move: 1000
      });
      myboard = _player.board;
      myplayer = _player;

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
      if (playerColor == "black") {
        enable_board();
      }

      // game = serverGame.board ? new Chess(serverGame.board) : new Chess();
      // board = new ChessBoard('game-board', cfg);
    };

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
          c: myplayer.kifuReader.game.turn,
        };
        myboard.addObject(this._last_mark);
      } else {
        delete this._last_mark;
      }
    };

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
            c: myplayer.kifuReader.game.turn,
          },
          BL: black_time,
          WL: white_time,
          _edited: true,
        });
      } else {
        node = new WGo.KNode({
          move: {
            x: x,
            y: y,
            c: myplayer.kifuReader.game.turn,
          },
          BL: black_time,
          WL: white_time,
          _edited: true,
        });
      }
      move = {
        x: x,
        y: y,
        c: myplayer.kifuReader.game.turn,
      };
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
      socket.emit("move", data);

      disable_board();
      read_time();
    };

    var disable_board = function () {
      score = document.getElementById("game-score");
      score.disabled = true;
      myboard.removeEventListener("click", _ev_click);
      myboard.removeEventListener("mousemove", _ev_move);
      myboard.removeEventListener("mouseout", _ev_out);
    };

    //enable board so it can play
    var enable_board = function () {
      var last_steps = myplayer.kifuReader.path.m;
      var turn = last_steps % 4;
      if (turn == 0 && username == game.users.black) {
        //black 0
        add_event();
      }
      if (turn == 1 && username == game.users.white) {
        //white 0
        add_event();
      }
      if (turn == 2 && username == game.users.black0) {
        //black 1
        add_event();
      }
      if (turn == 3 && username == game.users.white0) {
        //white 1
        add_event();
      }
    };
    var add_event = function () {
      score = document.getElementById("game-score");
      score.disabled = false;
      _ev_move = _ev_move || edit_board_mouse_move.bind(myboard);
      _ev_out = _ev_out || edit_board_mouse_out.bind(myboard);
      _ev_click = _ev_click || play.bind(myboard);
      myboard.addEventListener("mousemove", _ev_move);
      myboard.addEventListener("click", _ev_click);
      myboard.addEventListener("mouseout", _ev_out);
    };

    // board mouseout callback for edit move
    var edit_board_mouse_out = function () {
      if (this._last_mark) {
        myboard.removeObject(this._last_mark);
        delete this._last_mark;
        delete this._lastX;
        delete this._lastY;
      }
    };
    // 显示分数
    function getScore() {
      if (score_selected) {
        myplayer.setFrozen(false);
        this._score_mode.end();
        delete this._score_mode;
        myplayer.notification();
        myplayer.help();
        score_selected = false;
      } else {
        myplayer.setFrozen(true);
        myplayer.help("<p>" + WGo.t("help_score") + "</p>");
        this._score_mode = new WGo.ScoreMode(
          myplayer.kifuReader.game.position,
          myplayer.board,
          myplayer.kifu.info.KM || 0.5,
          myplayer.notification
        );
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
          black_time -= 1;
          myplayer.kifuReader.node.BL = black_time;

          myplayer.update();
          if (myplayer.kifuReader.node.BL == 0) {
            game_over("白超时胜");
          }
        }, 1000);
      } else {
        timer_loop = setInterval(function () {
          white_time -= 1;
          myplayer.kifuReader.node.WL = white_time;

          myplayer.update();
          if (myplayer.kifuReader.node.WL == 0) {
            game_over("黑超时胜");
          }
        }, 1000);
      }

      // myplayer.update();
    };

    var set_info = function () {
      myplayer.kifu.info["PB"] = "hello world";
      myplayer.loadSgf(myplayer.kifu.toSgf(), 1000);
      myplayer.update();
    };

    var game_over = function (result) {
      clearTimeout(timer_loop);
      node = new WGo.KNode({
        RE: result,
      });
      // append new node to the current kifu
      myplayer.kifuReader.node.appendChild(node);

      myplayer.kifu.info["RE"] = result;
      // myplayer.kifu.info['BL'] = black_time;
      // myplayer.kifu.info['WL'] = white_time;
      myplayer.loadSgf(myplayer.kifu.toSgf(), 1000);
      myplayer.kifuReader.node.WL = white_time;
      myplayer.kifuReader.node.BL = black_time;

      myplayer.update();
      alert(result);
      $("#result").append("<h3>" + result + "</h3>");
      console.log(myplayer.kifu.toSgf());
      console.log("info is " + myplayer.kifu.info);

      disable_board();
    };

    var move_play = function (player, x, y) {
      // ignore invalid move
      if (player.frozen || !player.kifuReader.game.isValid(x, y)) return;

      var node;
      // create new node
      if (x == null) {
        node = new WGo.KNode({
          move: {
            pass: true,
            c: player.kifuReader.game.turn,
          },
          BL: black_time,
          WL: white_time,
          _edited: true,
        });
      } else {
        node = new WGo.KNode({
          move: {
            x: x,
            y: y,
            c: player.kifuReader.game.turn,
          },
          BL: black_time,
          WL: white_time,
          _edited: true,
        });

        // append new node to the current kifu
        player.kifuReader.node.appendChild(node);

        // show next move
        player.next(player.kifuReader.node.children.length - 1);
        read_time();
      }
    };
  });
})();
