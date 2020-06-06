(function() {
  "use strict";
  var whiteList = [];
  var blackList = [];
  var _html = '<font size="3" face="verdana" color="green"> 行棋 </font>';

  var prepare_dom = function(opponent) {
    while (whiteList.length > 0) {
      whiteList.pop();
    }
    while (blackList.length > 0) {
      blackList.pop();
    }
    for (var i = 0; i < opponent / 2; i++) {
      var w = prepare_dom_box.call(this, "white");
      var b = prepare_dom_box.call(this, "black");
      this.element.appendChild(this.white.box);
      this.element.appendChild(this.black.box);
      whiteList.push(w);
      blackList.push(b);
    }
  };

  var prepare_dom_box = function(type) {
    this[type] = {};
    var t = this[type];
    t.box = document.createElement("div");
    t.box.className = "wgo-box-wrapper wgo-player-wrapper wgo-" + type;

    t.name = document.createElement("div");
    t.name.className = "wgo-box-title";
    t.name.innerHTML = type;
    t.box.appendChild(t.name);

    var info_wrapper;
    info_wrapper = document.createElement("div");
    info_wrapper.className = "wgo-player-info";
    t.box.appendChild(info_wrapper);

    t.info = {};
    t.info.rank = prepare_dom_info("rank");
    t.info.rank.val.innerHTML = "-";
    t.info.caps = prepare_dom_info("caps");
    t.info.caps.val.innerHTML = "0";
    t.info.time = prepare_dom_info("time");
    t.info.time.val.innerHTML = "--:--";
    t.savedValue = ""; //保存innerhtml
    info_wrapper.appendChild(t.info.time.wrapper);
    info_wrapper.appendChild(t.info.caps.wrapper);
    info_wrapper.appendChild(t.info.rank.wrapper);

    return t;
  };

  var prepare_dom_info = function(type) {
    var res = {};
    res.wrapper = document.createElement("div");
    res.wrapper.className = "wgo-player-info-box-wrapper";

    res.box = document.createElement("div");
    res.box.className = "wgo-player-info-box";
    res.wrapper.appendChild(res.box);

    res.title = document.createElement("div");
    res.title.className = "wgo-player-info-title";
    res.title.innerHTML = WGo.t(type);
    res.box.appendChild(res.title);

    res.val = document.createElement("div");
    res.val.className = "wgo-player-info-value";
    res.box.appendChild(res.val);

    return res;
  };

  var kifu_loaded = function(e) {
    var info = e.kifu.info || {};

    if (info.black) {
      let user = info.black.name.split("&"); //解析对局者信息，以&分隔
      blackList[0].name.innerHTML = WGo.filterHTML(user[0]) || WGo.t("black");
      blackList[1].name.innerHTML = WGo.filterHTML(user[1]) || WGo.t("black");

      blackList[0].info.rank.val.innerHTML =
        WGo.filterHTML(info.black.rank) || "-";
      blackList[1].info.rank.val.innerHTML =
        WGo.filterHTML(info.black.rank) || "-";
    } else {
      blackList[0].name.innerHTML = WGo.t("black");
      blackList[1].name.innerHTML = WGo.t("black");

      blackList[0].info.rank.val.innerHTML = "-";
      blackList[1].info.rank.val.innerHTML = "-";
    }
    blackList[0].info.caps.val.innerHTML = "0";
    blackList[1].info.caps.val.innerHTML = "0";

    if (info.TM) {
      this.setPlayerTime(blackList[0], info.TM);
      this.setPlayerTime(blackList[1], info.TM);
    } else {
      blackList[0].info.time.val.innerHTML = "--:--";
      blackList[1].info.time.val.innerHTML = "--:--";
    }

    blackList[0].savedValue = blackList[0].name.innerHTML;
    blackList[1].savedValue = blackList[1].name.innerHTML;

    if (info.white) {
      let user = info.white.name.split("&");
      whiteList[0].name.innerHTML = WGo.filterHTML(user[0]) || WGo.t("white");
      whiteList[1].name.innerHTML = WGo.filterHTML(user[1]) || WGo.t("white");
      whiteList[0].info.rank.val.innerHTML =
        WGo.filterHTML(info.white.rank) || "-";
      whiteList[1].info.rank.val.innerHTML =
        WGo.filterHTML(info.white.rank) || "-";
    } else {
      whiteList[0].name.innerHTML = WGo.t("white");
      whiteList[0].info.rank.val.innerHTML = "-";
      whiteList[1].name.innerHTML = WGo.t("white");
      whiteList[1].info.rank.val.innerHTML = "-";
    }
    whiteList[0].info.caps.val.innerHTML = "0";
    whiteList[1].info.caps.val.innerHTML = "0";
    if (info.TM) {
      this.setPlayerTime(whiteList[0], info.TM);
      this.setPlayerTime(whiteList[1], info.TM);
    } else {
      whiteList[0].info.time.val.innerHTML = "--:--";
      whiteList[1].info.time.val.innerHTML = "--:--";
    }
    whiteList[0].savedValue = whiteList[0].name.innerHTML;
    whiteList[1].savedValue = whiteList[1].name.innerHTML;

    blackList[0].name.innerHTML = blackList[0].savedValue + _html;

    this.updateDimensions();
  };

  var modify_font_size = function(elem) {
    var css, max, size;

    if (elem.style.fontSize) {
      var size = parseInt(elem.style.fontSize);
      elem.style.fontSize = "";
      css = window.getComputedStyle(elem);
      max = parseInt(css.fontSize);
      elem.style.fontSize = size + "px";
    } else {
      css = window.getComputedStyle(elem);
      max = size = parseInt(css.fontSize);
    }

    if (size == max && elem.scrollHeight <= elem.offsetHeight) return;
    else if (elem.scrollHeight > elem.offsetHeight) {
      size -= 2;
      while (elem.scrollHeight > elem.offsetHeight && size > 1) {
        elem.style.fontSize = size + "px";
        size -= 2;
      }
    } else if (size < max) {
      size += 2;
      while (elem.scrollHeight <= elem.offsetHeight && size <= max) {
        elem.style.fontSize = size + "px";
        size += 2;
      }
      if (elem.scrollHeight > elem.offsetHeight) {
        elem.style.fontSize = size - 4 + "px";
      }
    }
  };
  //每下一步棋子都会调用这个进行更新操作
  var update = function(e) {
    //sunlf changed
    /**
     * origin is
     * if (e.node.BL) this.setPlayerTime("black", e.node.BL);
     * if (e.node.WL) this.setPlayerTime("white", e.node.WL);
     */

    if (e.path && e.node.move) {
      var last_steps = e.path.m;
      var turn = last_steps % e.opponent;
      if (turn == 1) {
        whiteList[0].name.innerHTML = whiteList[0].savedValue + _html;
        whiteList[1].name.innerHTML = whiteList[1].savedValue;
        blackList[0].name.innerHTML = blackList[0].savedValue;
        blackList[1].name.innerHTML = blackList[1].savedValue;
      } else if (turn == 2) {
        whiteList[0].name.innerHTML = whiteList[0].savedValue;
        whiteList[1].name.innerHTML = whiteList[1].savedValue;
        blackList[0].name.innerHTML = blackList[0].savedValue;
        blackList[1].name.innerHTML = blackList[1].savedValue + _html;
      } else if (turn == 3) {
        whiteList[0].name.innerHTML = whiteList[0].savedValue;
        whiteList[1].name.innerHTML = whiteList[1].savedValue + _html;
        blackList[0].name.innerHTML = blackList[0].savedValue;
        blackList[1].name.innerHTML = blackList[1].savedValue;
      } else if (turn == 0) {
        whiteList[0].name.innerHTML = whiteList[0].savedValue;
        whiteList[1].name.innerHTML = whiteList[1].savedValue;
        blackList[0].name.innerHTML = blackList[0].savedValue + _html;
        blackList[1].name.innerHTML = blackList[1].savedValue;
      }
    }
    for (var item in blackList) {
      if (e.node.BL >= 0) this.setPlayerTime(blackList[item], e.node.BL);
      if (e.position.capCount.black !== undefined)
        blackList[item].info.caps.val.innerHTML = e.position.capCount.black;
    }
    for (var item in whiteList) {
      if (e.node.WL >= 0) this.setPlayerTime(whiteList[item], e.node.WL);
      if (e.position.capCount.white !== undefined)
        whiteList[item].info.caps.val.innerHTML = e.position.capCount.white;
    }
  };

  /**
   * Implements box with basic informations about go players.
   */

  var InfoBox = WGo.extendClass(WGo.BasicPlayer.component.Component, function(
    player
  ) {
    this.super(player);
    this.element.className = "wgo-infobox";

    prepare_dom.call(this, 4); //TODO read from game opponent

    player.addEventListener("kifuLoaded", kifu_loaded.bind(this));
    player.addEventListener("update", update.bind(this));
  });

  InfoBox.prototype.setPlayerTime = function(color, time) {
    var min = Math.floor(time / 60);
    var sec = Math.round(time) % 60;
    color.info.time.val.innerHTML = min + ":" + (sec < 10 ? "0" + sec : sec);
  };

  InfoBox.prototype.updateDimensions = function() {
    modify_font_size(this.black.name);
    modify_font_size(this.white.name);
  };

  var bp_layouts = WGo.BasicPlayer.layouts;
  bp_layouts["right_top"].right.push("InfoBox");
  bp_layouts["right"].right.push("InfoBox");
  bp_layouts["one_column"].top.push("InfoBox");
  bp_layouts["no_comment"].top.push("InfoBox");

  WGo.i18n.en["rank"] = "Rank";
  WGo.i18n.en["caps"] = "Caps";
  WGo.i18n.en["time"] = "Time";

  WGo.BasicPlayer.component.InfoBox = InfoBox;
})(WGo);
