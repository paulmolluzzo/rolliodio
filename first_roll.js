Dice = new Meteor.Collection("dice");
Games = new Meteor.Collection("games");

if (Meteor.isClient) {
    
    Template.newgame.events({
        'click input.generate': function(){
        // Make a Timestamp
        var currentdate = new Date().getTime();
        
        // Create a new game, use the ID to make a hash for the game name
        var newId = Games.insert({date: currentdate});
        var newHash = newId.substring(0, 6);
        
        
        
        // Check to make sure it's unique
        // If it's not, try again
        
        var tryToAdd = Games.find({name: newHash}, {limit: 1}).count();
        console.log(newId);
        
        if (tryToAdd != 0) {
            console.log("Something exists")
        } else {
            Games.update({_id: newId}, {$set:{name:newHash}});
        }
        
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

  Template.die.events({
        'click input.roll': function () {
          var e = Math.floor(Math.random()*this.sides + 1);
          Dice.update({_id:this._id}, {$set:{result:e}});
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
      
      // Allows insertion into DB from client console
      Dice.allow({
        insert: function () { return true; },
        update: function () { return true; }
      });
      Games.allow({
        insert: function () { return true; },
        update: function () { return true; }
      });
      
    // if (Games.find().count() === 0) {
    //         var names = ["lqkwje",
    //                     "lakjdf",
    //                     "asldkfja"]
    //         for (var i = 0; i < names.length; i++) 
    //             Games.insert({name: names[i]});
    //     }
    

    // if (Dice.find().count() === 0) {
    //     var types = ["d6", "d8", "d4"];
    //     var sideCount = [6, 8, 4];
    //     for (var i = 0; i < types.length; i++) 
    //         Dice.insert({type: types[i], sides: sideCount[i], result: ""});
    // }
    
  });
}