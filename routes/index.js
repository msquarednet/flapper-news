//routes/index.js
var express = require('express');
var router = express.Router();
//
var mongoose = require('mongoose')
var passport = require('passport')
var jwt = require('express-jwt')
var auth = jwt({secret: 'SECRET', userProperty: 'payload'}) //auth middleware

var Post = mongoose.model('Post')
var Comment = mongoose.model('Comment')
var User = mongoose.model('User')


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


//AUTH
//Register
router.post('/register', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }
  var user = new User();
  user.username = req.body.username;
  user.setPassword(req.body.password)
  user.save(function (err){
    if(err){ return next(err); }
    return res.json({token: user.generateJWT()})
  });
});
//Login
router.post('/login', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }
  passport.authenticate('local', function(err, user, info){
    if(err){ return next(err); }
    if(user){
      return res.json({token: user.generateJWT()});
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});


//POSTS
//List
router.get('/posts', function(req,res,next){
  Post.find(function(err, posts){
    if (err) {return next(err)}
    res.json(posts);
  })
})
//Insert
router.post('/posts', auth, function(req,res,next){
  var post = new Post(req.body)
  post.author = req.payload.username;
  //console.log('new Post(req.body) = ', post)
  post.save(function(err, post){
    if (err) {return next(err)}
    res.json(post);
  })
})
//RUD middleware helper... (any endpoint with ':postId' in it)
router.param('postId', function(req,res,next, id) {     //Express's param function
  var query = Post.findById(id);                          //Mongoose's query function
  query.exec(function (err, post){
    if (err) { return next(err); }
    if (!post) { return next(new Error('can\'t find post')); }
    req.post = post;
    return next();
  });
});
//Select
router.get('/posts/:postId', function(req,res,next){
  req.post.populate('comments', function(err,post){
    if (err) {return next(err)}
    res.json(post);
  })
  //res.json(req.post)  //'post' from RUD helper, above
})
//Update
router.put('/posts/:postId/upvote', auth, function(req,res,next){ //only updating 'upvote', here
  req.post.upvote(function(err,post){
    if (err) {return next(err)}
    res.json(post);
  })
})


//COMMENTS
//Insert
router.post('/posts/:postId/comments', auth, function(req,res,next) {  //console.log(req.body)
  var comment = new Comment(req.body)
  comment.post = req.post;
  comment.author = req.payload.username;  //added with 'auth'
  comment.save(function(err,comment){
    if (err) {return next(err)}
    req.post.comments.push(comment);
    req.post.save(function(err,post){
      if (err) {return next(err)}
      res.json(comment);
    })
  })
})
//RUD middleware helper... (any endpoint with ':commentId' in it)
router.param('commentId', function(req,res,next, id) {     //Express's param function
  var query = Comment.findById(id);                          //Mongoose's query function
  query.exec(function (err, comment){
    if (err) { return next(err); }
    if (!comment) { return next(new Error('can\'t find comment')); }
    req.comment = comment;
    return next();
  });
});
//Update
router.put('/posts/:postId/comments/:commentId/upvote', auth, function(req,res,next){ //only updating 'upvote', here
  req.comment.upvote(function(err,comment){
    if (err) {return next(err)}
    res.json(comment);
  })
})


module.exports = router;
