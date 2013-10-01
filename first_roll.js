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

var setSideSelector = function() {
    var currentId = Session.get("current_game")
    var currentDice = Dice.find({game: currentId}).fetch();
    for( i=0; i<currentDice.length; i++) {
          var dieSides = currentDice[i].sides;
          var dieId = currentDice[i]._id;
          var targetSelector = document.getElementById(dieId);
          targetSelector[dieSides-2].selected=true;
      }
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
    } else {
        Session.set("error", e)
    }
};

Router.configure({
  layout: 'layout',
  notFoundTemplate: 'notFound',
  loadingTemplate: 'loading'
});

Router.map(function () {
  this.route('home', {
    path: '/'
  });

  this.route('currentgame', {
    template:'currentgame',
    path: '/:slug',
    before: function() {
                var slug = this.params.slug;
                if (Validation.game_exists(slug))
                  Session.set("current_game", slug);            
    },
    data: function() {
            return Games.findOne({slug: this.params.slug})
    },
    waitOn: function() {
                return App.subs.games;
    }
  });
  
  this.route('notFound', {
     path: '*'
   });
});

if (Meteor.isClient) {

    App = {
        subs: {
            games: Meteor.subscribe('games'),
            dice: Meteor.subscribe('dice')
        }
    };
    
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
    
    Template.currentgame.updateselect = function() {
        setTimeout(function(){setSideSelector()},1);
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
            }
        },
      
        'click a.exit-game': function () {
            Session.set("current_game", "");
        },
      
        'click input.roll-all': function () {
            var currentId = Session.get("current_game");
            var currentDice = Dice.find({game: currentId});
            var count = 0;
            currentDice.forEach(function (die) {
                rollDie(die);
                count += 1;
            });
        }
    });
  
    Template.die.rendered = function() {
        var originalMargin = $(".die-wrap").css("margin-left");
        var parsedMargin = originalMargin.replace(/[^-\d\.]/g, '');
        var ogMarginNum = parseInt(parsedMargin);
        $('.currentgame').find(".die-wrap").swipe( {
            swipeStatus:function(event, phase, direction, distance, fingers){
                $this = $(this);
                var targetId = $this.attr("data-id");
                var threshold = 150;
                
                if (direction=="left"){
                    $this.css("margin-left",ogMarginNum + (distance*-0.5) + "px");
                    if ( distance>threshold){
                        $this.css("margin-left", originalMargin);
                        rollDie(Dice.findOne({_id:targetId}));
                    }
                    if (phase=="end") {
                        $this.animate({marginLeft: originalMargin});
                    }
                }

                if (direction=="right"){
                    $this.css("margin-left",ogMarginNum + (distance/2) + "px");
                    if ( distance>threshold){
                        $this.parent().fadeOut('fast', function(){removeDie(targetId)});
                    } 
                    if (phase=="end") {
                        $this.animate({marginLeft: originalMargin});
                    }
                }
            }  
        });
    };
    
    Template.die.events({
        'click input.roll': function() {
            rollDie(this);
        },

        'click input.delete-die': function () {
            Dice.remove(this._id);
        },
        
        'change select.side-selector': function() {
            var t = document.getElementById(this._id);
            var v = t.options[t.selectedIndex].value;
            Dice.update({_id:this._id}, {$set:{sides:v, type:"d"+v}});
            setSideSelector();
        }
    });
  
    Template.newdie.events({
        'click input.generate-die': function(){
            var currentdate = new Date().getTime();
            var currentId = Session.get("current_game");
            Dice.insert({type: "d6", sides: 6, game: currentId, result:"-", rolled: "never"});
        }
    });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
      
      Meteor.publish("games", function(){
          return Games.find({});
      });
      
      Meteor.publish("dice", function(){
          return Dice.find();
      });
      
      // Uncomment to clear the DB
      // Games.remove({});
      // Dice.remove({});
      
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