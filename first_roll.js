Dice = new Meteor.Collection("dice");
Games = new Meteor.Collection("games");

if (Meteor.isClient) {
    
    Template.newgame.events({
        'click input.generate': function(){
        var currentdate = new Date();
        var datetime = "Last Sync: " + currentdate.getDate() + "/"+(currentdate.getMonth()+1) 
        + "/" + currentdate.getFullYear() + " @ " 
        + currentdate.getHours() + ":" 
        + currentdate.getMinutes() + ":" + currentdate.getSeconds();
        Games.insert({name: "test", });
        var newGame = Games.findOne({name: "test"})
        console.log(newGame);
        Dice.insert({type: "d6", sides: 6, game: newGame.name, date: currentdate})
        console.log(Dice.findOne({game: "test"}))
        }
    });
    
    Template.alldice.dice = function () {
      return Dice.find({}, {sort: {date: -1}});
    };
    Template.allgames.games = function () {
      return Games.find({});
    };
    
    
  Template.hello.greeting = function () {
    return "Welcome to first_roll.";
  }; 


  Template.die.events({
        'click input.roll': function () {
          var e = Math.floor(Math.random()*this.sides + 1);
          Dice.update({_id:this._id}, {$set:{result:e}});
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
    

    if (Dice.find().count() === 0) {
        var types = ["d6", "d8", "d4"];
        var sideCount = [6, 8, 4];
        for (var i = 0; i < types.length; i++) 
            Dice.insert({type: types[i], sides: sideCount[i], result: ""});
    }
    
  });
}