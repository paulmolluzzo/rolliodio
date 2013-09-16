Dice = new Meteor.Collection("dice");
Games = new Meteor.Collection("games");

var rollDie = function (t) {
    var e = Math.floor(Math.random()*t.sides + 1);
    Dice.update({_id:t._id}, {$set:{result:e}});
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
    
    Template.alldice.dice = function () {
        if (Session.get("current_game") === ""){
            return Dice.find({}, {sort: {date: -1}});
        } else {
            var currentId = Session.get("current_game");
            return Dice.find({game: currentId});
        }
    };
    
    Template.currentgame.games = function() {
        var currentId = Session.get("current_game");
        return Games.find({_id: currentId});
    };
    
    Template.currentgame.error = function () {
      return Session.get("error");
      }
    
    Template.currentgame.events({
        'click input.change-name': function () {
          var newName = document.getElementById("update_game_name").value.trim();
          console.log(newName);
          // Games.update({_id:this._id}, {$set:{name:newName}});
          if (Validation.valid_name(newName)) {
            Games.update({_id:this._id}, {$set:{name:newName}});
          }
      },
      
      'click input.roll-all': function () {
          var currentId = Session.get("current_game");
          var currentDice = Dice.find({game: currentId});
          var count = 0;
          currentDice.forEach(function (die) {
            rollDie(die);
            console.log("Game id for die number " + count + ": " + die.game);
            count += 1;
          });
    }
      
      
    });

  Template.die.events({
      'click input.roll': function() {
          rollDie(this);
      },

      'click input.delete-die': function () { // <-- here it is
          Dice.remove(this._id);
        }
  });
  
  Template.newdie.events({
      'click input.generatedie': function(){
      var currentdate = new Date().getTime();
      var currentId = Session.get("current_game");
      Dice.insert({type: "d6", sides: 6, game: currentId, date: currentdate})
      console.log(Dice.findOne({date: currentdate}))
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