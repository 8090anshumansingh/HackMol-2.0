
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

app.use(express.static(__dirname+"/public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/peerDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

var defaultCoins = 10;
var defCoins = 10;
var currentPeer;
var currentPeerCoins;

const studentSchema = {
  name: String,
  email: String,
  password: String,
  coins: Number
};
const Peer = mongoose.model("Peer", studentSchema);

const querySchema = {
  query: String,
  askedBy: String,
  answered: Boolean
};
const Query = mongoose.model("Query", querySchema);

const solutionSchema = {
  query: String,
  solution: String,
  answeredBy: String,
  liked: Boolean,
  disliked: Boolean
};
const Solution = mongoose.model("Solution", solutionSchema);

const noSol = new Solution({
  query: "No",
  solution: "No one answered this query",
  answeredBy: "No one",
  liked: false,
  disliked: false
});

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  const newPeer = new Peer({
    name: req.body.peername,
    email: req.body.peermail,
    password: md5(req.body.password),
    coins: 10
  });
  newPeer.save(function(err) {
    if (!err) {
      Peer.find({}, function(er, foundPeers){
        if(er){console.log(er);}
        else {if(foundPeers.length==1){
          noSol.save(function(e){
            if(e){
              console.log(e);
            }
          });
        }}
      });
      res.redirect("/login");
    } else {
      res.send(err);
    }
  });
});

app.post("/login", function(req, res) {
  const peerMail = req.body.peermail;
  const peerPassword = req.body.password;
  Peer.findOne({email: peerMail}, function(err, foundPeer) {
    if (!err) {
      if (foundPeer) {
        if (foundPeer.password === md5(peerPassword)) {
          currentPeer = foundPeer.name;
          currentPeerCoins = foundPeer.coins;
          res.render("profile", {
            Peer: currentPeer,
            Coins: currentPeerCoins
          });
        } else {
          res.render("loginIn");
        }
      } else {
        res.render("loginIn");
      }
    } else {
      console.log(err);
    }
  });
});

app.get("/profile/:user", function(req, res) {
  Peer.findOne({name: req.params.user}, function(err, foundPeer) {
    if (!err) {
        if(foundPeer!=null){
          res.render("profile", {
            Peer: currentPeer,
            Coins: currentPeerCoins
          });}
    } else {
      res.send(err);
    }
  });
});

var sol=[];
var qur=[];
app.get("/askedByMe", function(req, res){
  Query.find({askedBy: currentPeer}, function(err, foundQueries){
    if(!err){
    var i=0;
    var j=0;
    sol=[];
    qur=[];
      foundQueries.forEach(function(q){
        qur.push(q);
        j++;
        Solution.find({query: q.query, disliked: false}, function(er, foundSolutions){
          if(!er){
            if(foundSolutions[0]!=null){
              // console.log("FOUND and pushed: "+foundSolutions[0]);
              sol.push(foundSolutions[0]);
              //sol.push(foundSolution[0]);
            } else {
              // console.log("pushed noSol");
              sol.push(noSol);
            }
          } else {
            console.log("This"+er);
          }
        });
      });
      // console.log("Qur: "+qur);
      // console.log("Sol: "+sol);
      res.redirect("/queriesAskedByMe");
    } else {
      res.send(err);
    }
  });
});

app.get("/queriesAskedByMe", function(req, res){
  res.render("askedByMe", {
    Peer: currentPeer,
    Coins: currentPeerCoins,
    queries: qur,
    s: sol
  });
});

app.get("/askQuery", function(req, res){
  if(currentPeerCoins>2){
  res.render("askQuery", {
    Peer: currentPeer,
    Coins: currentPeerCoins
  });} else {
    res.render("dont",{
      Peer: currentPeer,
      Coins: currentPeerCoins
    })
  }
});

app.post("/askQuery", function(req, res){
  const newQuery = new Query({
    query: req.body.query,
    askedBy: req.body.askedBy,
    answered: false
  });
  newQuery.save(function(err) {
    if (!err) {
      Peer.findOne({name: currentPeer}, function(er, user){
        user.coins=user.coins-3;
        currentPeerCoins-=3;
        user.save(function(e){
          if(e){console.log(e);}
        });
      });
        res.render("profile", {
        Peer: currentPeer,
        Coins: currentPeerCoins-3
      });
    } else {
      res.send(err);
    }
  });
});

app.get("/askedByPeers", function(req, res){
  Query.find({answered:false, askedBy: {$ne: currentPeer}}, function(err, foundQueries){
    res.render("askedByPeers", {
      Peer: currentPeer,
      Coins: currentPeerCoins,
      queries: foundQueries
    });
  });
});

var ab=[];
var fsol=[];
app.get("/answeredByMe", function(req, res){
  Solution.find({answeredBy: currentPeer}, function(err, foundSolutions){
    if(!err){
      ab=[];
      fsol=[];
      // console.log("Lenght of foundsolutions: "+foundSolutions.length);
      foundSolutions.forEach(function(s){
      fsol.push(s);
        // console.log("Fsol pushed:"+s);
        // console.log("Length of Fsol: "+fsol.length);
        let answeredQuery = s.query;
        Query.find({query: answeredQuery}, function(er, foundQuery){
          if(!er){
            if(foundQuery[0]!=null){
              ab.push(foundQuery[0]);
            }
            // console.log("Ab Pushed:"+foundQuery[0]);
          } else {
            console.log(er);
          }
        });
      });
    } else {
      console.log(err);
    }
    res.redirect("/queriesAnsweredByMe");
  });
});

app.get("/queriesAnsweredByMe", function(req, res){
   // console.log("askedBy: "+ab);
   // console.log("foundSolutions: "+fsol);
  res.render("answeredByMe", {
    Peer: currentPeer,
    Coins: currentPeerCoins,
    sol: fsol,
    qs: ab
  });
});

app.post("/answered/:user", function(req, res){
  console.log(req.body.ans);
  Query.findOne({_id: req.params.user}, function(err, foundQuery){
    foundQuery.answered = true;
    const sol = new Solution({
      query: foundQuery.query,
      solution: req.body.ans,
      answeredBy: currentPeer,
      liked: false,
      disliked: false
    });
    foundQuery.save();
    sol.save(function(e){
      if(e){
        console.log(e);
      }
    });
  });
  res.redirect("/askedByPeers");
});

app.get("/like/:user", function(req, res){
  Solution.findOne({_id: req.params.user}, function(err, foundSolution){
    if(!err){
    foundSolution.liked = true;
    foundSolution.save(function(er){
      if(er){res.send(er);}
    });
    Peer.findOne({name: foundSolution.answeredBy}, function(err, foundPeer){
      foundPeer.coins+=5;
      foundPeer.save(function(er){
        if(er){res.send(er);}
      });
    });} else {
      console.log(err);
    }
  });
  res.redirect("/askedByMe");
});

app.get("/dislike/:user", function(req, res){
  Solution.findOne({_id: req.params.user}, function(err, foundSolution){
    if(!err){
    foundSolution.disliked = true;
    Query.findOne({query: foundSolution.query}, function(er, foundQuery){
      if(!er){
        foundQuery.answered= false;
        foundQuery.save();
      } else {
        console.log(er);
      }
    });
    foundSolution.save(function(er){
      if(er){res.send(er);}
    });} else {
      console.log(err);
    }
  });
  res.redirect("/askedByMe");
});

app.get("/add", function(req, res){
  Peer.findOne({name: currentPeer}, function(er, user){
    user.coins=user.coins+10;
    currentPeerCoins+=10;
    user.save(function(e){
      if(e){console.log(e);}
      else{
        res.redirect("/video");
      }
    });
  });
});

app.get("/video", function(req, res){
  res.render("video",{
    Peer: currentPeer
  });
});

app.get("/offers", function(req, res) {
  res.render("offers",{
    Peer: currentPeer,
    Coins: currentPeerCoins
  });
});

app.get("/logout", function(req, res) {
  res.redirect("/");
});

app.listen(3000, function() {
  console.log("server is running at port 3000");
})
