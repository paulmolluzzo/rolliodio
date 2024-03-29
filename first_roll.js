Dice = new Meteor.Collection("dice");
Games = new Meteor.Collection("games");

// Common functionality

var rollDie = function (t) {
    var currentDate = new Date(); 
    var dateTime = (currentDate.getMonth()+1) + "/"
                    + (currentDate.getDate())  + "/" 
                    + currentDate.getFullYear() + " @ "  
                    + currentDate.getHours() + ":"  
                    + currentDate.getMinutes() + ":" 
                    + currentDate.getSeconds();
    var e = Math.floor(Math.random()*t.sides + 1);
    Dice.update({_id:t._id}, {$set:{result:e, rolled:dateTime}});
};

var removeDie = function(targetid) {
    Dice.remove({_id: targetid});
};

Validation = {
  clear: function () { 
    return Session.set("error", undefined); 
  },
  set_error: function (message) {
    return Session.set("error", message);
  },
  valid_name: function (name) {
    this.clear();
    if (name.length == 0) {
      this.set_error("Name can't be blank");
      return false;
    } else if (this.game_exists(name)) {
      this.set_error("Game already exists. Try again.");
      return false;
    } else {
      return true;
    }
  },
  game_exists: function(name) {
    return Games.findOne({slug: name});
  }
};

var validCreation = function(i, h, m, d) {
    if (Validation.valid_name(h)) {
        Games.update({_id: i}, {$set:{slug:h}});
        Session.set("current_game", h);
        Dice.insert({type: "d6", sides: 6, game: h, date: d, result: "-", rolled: "never"});
        Router.go('currentgame', {slug: h});
        _gaq.push(['_trackEvent', 'games', 'new_game']);
    } else {
        console.log("Found a match and trying again")
        m = (Math.floor(Math.random()*9+1)) + i;
        h = m.substring(0, 6);
        validCreation(i, h, m);
    }
};

var enterExisting = function(n) {
    var g = Games.findOne({slug:n});
    var e = "That game doesn't exist.";
    Session.set("error", null);
    Session.set("no_game", null);
    if (Validation.game_exists(n)){
        Validation.clear();
        Session.set("current_game", g.slug);
        Router.go('currentgame', {slug: n});
        _gaq.push(['_trackEvent', 'games', 'enter-game', n]);
    } else {
        Session.set("error", e)
    }
};

Router.configure({
  layoutTemplate: 'layout',
  notFoundTemplate: 'notFound',
  loadingTemplate: 'loading'
});

Router.map(function () {
  this.route('home', {
    path: '/',
    layoutTemplate:'layout'
  });

  this.route('currentgame', {
    template:'currentgame',
    path: '/:slug',
    onBeforeAction: function() {
                var slug = this.params.slug;
                if (Validation.game_exists(slug))
                  Session.set("current_game", slug);            
    },
    data: function() {
            return Games.findOne({slug: this.params.slug})
    },
    waitOn: function() {
            return Meteor.subscribe('dice', Session.get("current_game"));
    }
  });
  
  this.route('notFound', {
     path: '*'
   });
});

if (Meteor.isClient) {
        
    Meteor.subscribe('games');
    
    Handlebars.registerHelper('currentGameIs',function(game){
        return Session.get("current_game") == game;
    });
    
    Template.newgame.events({
        'click input.generate': function(){
        var currentdate = new Date().getTime();        
        var newId = Games.insert({date: currentdate});
        var modifiedId = newId;
        var newHash = modifiedId.substring(0, 6);
        Session.set("no_game", null);
        validCreation(newId, newHash, modifiedId);
        }
    });
    
    Template.entergame.events({
        'click input.enter-game': function(){
        var n = document.getElementById('enter-game-name').value;
        enterExisting(n);
    }
    });
    
    Template.entergame.error = function() {
        return  Session.get("error")
    }
    
    Template.currentgame.dice = function () {
        var currentId = Session.get("current_game");
        return Dice.find({game: currentId});
    };
    
    Template.currentgame.games = function() {
        var currentId = Session.get("current_game");
        return Games.find({slug: currentId});
    };
    
    Template.currentgame.error = function () {
        return Session.get("error");
    };
    
    Template.currentgame.events({
        'change #update-game-name': function () {
            var n = document.getElementById("update-game-name").value.trim();
            if (Validation.valid_name(n)) {
                var currentId = Session.get("current_game");
                var currentDice = Dice.find({game: currentId});
                var count = 0;
                currentDice.forEach(function (die) {
                    Dice.update({_id:die._id}, {$set:{game:n}});
                    count += 1;
                });
                Games.update({_id:this._id}, {$set:{slug:n}});
                Router.go('currentgame', {slug: n});
                _gaq.push(['_trackEvent', 'games', 'new_game_name', n]);
            }
        },
      
        'click a.exit-game': function () {
            Session.set("current_game", "");
            _gaq.push(['_trackEvent', 'games', 'exit']);
        },
      
        'click input.roll-all': function () {
            var currentId = Session.get("current_game");
            var currentDice = Dice.find({game: currentId});
            var count = 0;
            currentDice.forEach(function (die) {
                rollDie(die);
                count += 1;
            });
            _gaq.push(['_trackEvent', 'dice', 'roll_all']);
        }
    });
  
    Template.die.rendered = function() {
        $('.currentgame').on('touchstart mousedown', '.single-die', function(){
            var originalMargin = $(".die-wrap").css("margin-left");
            var parsedMargin = originalMargin.replace(/[^-\d\.]/g, '');
            var ogMarginNum = parseInt(parsedMargin);
            $(this).swipe( {
                swipeStatus:function(event, phase, direction, distance, fingers){
                    $this = $(this);
                    var target = $(this).children('.die-wrap');
                    var targetId = target.attr("data-id");
                    var threshold = 150;
                
                    if (direction=="left"){
                        target.css("margin-left",ogMarginNum + (distance*-0.5) + "px");
                        if ( distance>threshold){
                            target.css("margin-left", originalMargin);
                            setTimeout(rollDie(Dice.findOne({_id:targetId})), 100);
                            _gaq.push(['_trackEvent', 'dice', 'roll_one']);
                        }
                        if (phase=="end") {
                            target.animate({marginLeft: originalMargin});
                        }
                    }

                    if (direction=="right"){
                        target.css("margin-left",ogMarginNum + (distance/2) + "px");
                        if ( distance>threshold){
                            $this.fadeOut('fast', function(){removeDie(targetId)});
                            _gaq.push(['_trackEvent', 'dice', 'delete_one']);
                        } 
                        if (phase=="end") {
                            target.animate({marginLeft: originalMargin});
                        }
                    }
                } 
            });
        });
    };
    
    Template.die.events({
        'click input.roll': function() {
            rollDie(this);
            _gaq.push(['_trackEvent', 'dice', 'roll_one']);
        },

        'click input.delete-die': function () {
            Dice.remove(this._id);
            _gaq.push(['_trackEvent', 'dice', 'delete_one']);
        },
        
        'change input.side-selector': function() {
            var t = document.getElementById(this._id);
            var v = t.value;
            if (!isNaN(v) && (v > 0)) {
                Dice.update({_id:this._id}, {$set:{sides:v, type:"d"+v}});
                _gaq.push(['_trackEvent', 'dice', 'update_sides', v]);
            } else {
                t.value = ""
            }
        }
    });
  
    Template.newdie.events({
        'click input.generate-die': function(){
            var currentdate = new Date().getTime();
            var currentId = Session.get("current_game");
            Dice.insert({type: "d6", sides: 6, game: currentId, result:"-", rolled: "never"});
            _gaq.push(['_trackEvent', 'dice', 'add_die', currentId]);
        }
    });
}

if (Meteor.isServer) {
  Meteor.startup(function () {

      Games.insert({});

      
      Meteor.publish("games", function(){
          return Games.find({});
      });
      
      Meteor.publish("dice", function(currentGame){
          return Dice.find({game: currentGame});
      });
      
      Dice.allow({
          insert: function () { return true; },
          update: function () { return true; },
          remove: function () { return true; }
      });

      Games.allow({
          insert: function () { return true; },
          update: function () { return true; }
      });
  });
}