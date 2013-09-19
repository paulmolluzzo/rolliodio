Dice = new Meteor.Collection("dice");
Games = new Meteor.Collection("games");

var rollDie = function (t) {
    var currentDate = new Date(); 
    var dateTime = currentDate.getDate() + "/"
                    + (currentDate.getMonth()+1)  + "/" 
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
          targetSelector[dieSides-2].setAttribute('selected', 'selected');
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
    console.log("message");
  },
  valid_name: function (name) {
    this.clear();
    if (name.length == 0) {
      this.set_error("Name can't be blank");
      return false;
    } else if (this.game_exists(name)) {
      this.set_error("Game already exists");
      return false;
    } else {
      return true;
    }
  },
  game_exists: function(name) {
    return Games.findOne({name: name});
  }
};

var validCreation = function(i, h, m) {
    if (Validation.valid_name(h)) {
      Games.update({_id: i}, {$set:{name:h}});
      console.log("First Try")
    } else {
        console.log("Found a match and trying again")
        m = (Math.floor(Math.random()*9+1)) + i;
        h = m.substring(0, 6);
        validCreation(i, h, m);
    }
};

if (Meteor.isClient) {
    Meteor.startup(function () {
        Session.set("current_game", "");
        Session.set("error", null);
    });
    
    
    Handlebars.registerHelper('currentGameIs',function(game){
        return Session.get("current_game") == game;
    });
    
    Template.newgame.events({
        'click input.generate': function(){
        var currentdate = new Date().getTime();        
        var newId = Games.insert({date: currentdate});
        var modifiedId = newId;
        var newHash = modifiedId.substring(0, 6);
        
        validCreation(newId, newHash, modifiedId);
        
        // Make the newly created game "current" for the session
         Session.set("current_game", newId);
        
        // Create a new die and assign it to that game
        Dice.insert({type: "d6", sides: 6, game: newId, date: currentdate})

        }
    });
    
    Template.entergame.events({
        'click input.enter-game': function(){
        var n = document.getElementById('enter_game_name').value;
        var g = Games.findOne({name:n});
        var e = "That game doesn't exist."
        
        if (Validation.game_exists(n)){
            Validation.clear();
            Session.set("current_game", g._id);
        } else {
            Session.set("error", e)
        }
    }
    });
    
    Template.entergame.error = function() {
        return  Session.get("error")
    }
    
    Template.currentgame.dice = function () {
        if (Session.get("current_game") === "0"){
            return Dice.find({}, {sort: {date: -1}});
        } else {
            var currentId = Session.get("current_game");
            return Dice.find({game: currentId});
        }
    };
    
    Template.currentgame.updateselect = function() {
        Meteor.defer(function(){setSideSelector();});
    };
    
    Template.currentgame.games = function() {
        var currentId = Session.get("current_game");
        return Games.find({_id: currentId});
    };
    
    Template.currentgame.error = function () {
      return Session.get("error");
      };
    
    Template.currentgame.events({
        'change #update_game_name': function () {
          var newName = document.getElementById("update_game_name").value.trim();
          if (Validation.valid_name(newName)) {
            Games.update({_id:this._id}, {$set:{name:newName}});
          }
      },
      
      'click input.exit-game': function () {
        Session.set("current_game", "")
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
            Dice.update({_id:this._id}, {$set:{sides:v}});
        }
  });
  
  Template.die.rendered = function() {
      var originalMargin = $(".die-wrap").css("margin-left");
      var parsedMargin = originalMargin.replace(/[^-\d\.]/g, '');
      var ogMarginNum = parseInt(parsedMargin);
      $(".die-wrap").swipe( {
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


              
              
            }).stop();
  };
  
  Template.newdie.events({
      'click input.generate-die': function(){
      var currentdate = new Date().getTime();
      var currentId = Session.get("current_game");
      console.log(Session.get("current_game"));
      Dice.insert({type: "d6", sides: 6, game: currentId});
      }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
      
      // Uncomment to clear the DB
      // Games.remove({});
      // Dice.remove({});
      
      // Allows insertion, update, removal within DB from client console
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