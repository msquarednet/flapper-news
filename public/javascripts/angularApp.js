angular.module('flapperNews', ['ui.router'])
.config(['$stateProvider', '$urlRouterProvider','$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider){
  //$locationProvider.html5Mode({ enabled: true, requireBase: false })
  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: 'home.html',
      controller: 'MainCtrl', 
      resolve: {
        postPromise: ['postSvc', function(postSvc){   //pass in postSvc svc
          return postSvc.getAll();
        }]
      }
    })
    .state('posts', {
      url: '/posts/:id',  
      templateUrl: 'posts.html',
      controller: 'PostsCtrl',
      resolve: {
        post: ['$stateParams', 'postSvc', function($stateParams, postSvc) {
          return postSvc.getPost($stateParams.id)
        }]
      }
    })
    .state('login', {
      url: '/login',
      templateUrl: '/login.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'authSvc', function($state, authSvc){ //'OnEnter' from ui-router
        if(authSvc.isLoggedIn()){
          //$state.go('home');
        }
      }]
    })
    .state('register', {
      url: '/register',
      templateUrl: '/register.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'authSvc', function($state, authSvc){
        if(authSvc.isLoggedIn()){
          // $state.go('home');
        }
      }]
    });

  $urlRouterProvider.otherwise('home')
}])

.factory('authSvc', ['$http', '$window', function($http, $window){
  var obj = {}
  obj.saveToken= function (token){ $window.localStorage['flapper-news-token'] = token; }
  obj.getToken = function (){ return $window.localStorage['flapper-news-token']; }  
  obj.isLoggedIn = function(){    // console.log('isLoggedIn()')
    var token = obj.getToken();
    if(token){
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      // console.log('token', token)
      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  };  
  obj.currentUser = function(){
    if(obj.isLoggedIn()){
      var token = obj.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      // console.log('currentUser = ' + payload.username)
      // console.log('payload... ', payload)
      return payload.username;
    }
  };
  obj.register = function(user){
    return $http.post('/register', user).success(function(data){
      obj.saveToken(data.token);
    });
  };
  obj.logIn = function(user){
    return $http.post('/login', user).success(function(data){
      obj.saveToken(data.token);
    });
  };
  obj.logOut = function(){
    $window.localStorage.removeItem('flapper-news-token');
  };
  return obj;
}])

.factory('postSvc', ['$http', 'authSvc', function($http, authSvc){
  var obj = {
    posts: []    // posts: [    //   {title:'wired', upvotes:3, link:'http://www.wired.com', comments:[]}    // ]
  };
  obj.getAll = function(){    //console.log('getAll()')
    return $http.get('/posts').then(function(res){
      angular.copy(res.data, obj.posts);
    }).catch(function(err){console.log('ERR', err)})
  };
  obj.getPost = function(id){   //console.log('getPost('+id+')...')
    return $http.get('/posts/'+id).then(function(res){
      return res.data
    }).catch(function(err){console.log('ERR', err)})
  };
  obj.create = function(post) {    //console.log('create()')
    return $http.post('/posts', post, {headers: {Authorization: 'Bearer '+authSvc.getToken()}}).then(function(res){
      obj.posts.push(res.data);      //return 'foofy'
    }).catch(function(err){console.log('ERR', err)})
  }
  obj.upvote = function(post){    //console.log('upvote()')
    return $http.put('/posts/'+post._id+'/upvote', null, {headers: {Authorization: 'Bearer '+authSvc.getToken()}}).then(function(res){
      post.upvotes = res.data.upvotes;
    }).catch(function(err){console.log('ERR', err)})
  }
  obj.addComment = function(id, comment) {    //console.log('addComment()')
    return $http.post('/posts/'+id+'/comments', comment, {headers: {Authorization: 'Bearer '+authSvc.getToken()}}).then(function(res){
      return res.data;      
    }).catch(function(err){console.log('ERR', err)})
  }
  obj.upvoteComment = function(id, comment){    //console.log('upvote()')
    return $http.put('/posts/'+id+'/comments/'+comment._id+'/upvote', null, {headers: {Authorization: 'Bearer '+authSvc.getToken()}}).then(function(res){
      comment.upvotes = res.data.upvotes;
    }).catch(function(err){console.log('ERR', err)})
  }
  return obj;
}])



.controller('AuthCtrl', ['$scope','$state','authSvc',function($scope, $state, authSvc){
  $scope.user = {};
  $scope.register = function(){
    authSvc.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
  $scope.logIn = function(){
    authSvc.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}])


.controller('NavCtrl', ['$scope','authSvc',function($scope, authSvc){
  $scope.isLoggedIn = authSvc.isLoggedIn;
  $scope.currentUser = authSvc.currentUser;
  $scope.logOut = authSvc.logOut;
}])

.controller('MainCtrl', ['$scope', 'postSvc', 'authSvc', function($scope, postSvc, authSvc){   //pass in postSvc svc
  $scope.test = 'Howdy.';
  $scope.posts = postSvc.posts;
  $scope.isLoggedIn = authSvc.isLoggedIn();

  $scope.addPost = function(){
    if ($scope.title==='') {return;}
    var title = $scope.title || 'foobar';
    var link = $scope.link;
    postSvc.create({title:title, link:link}).then(function(){
      $scope.title=''; $scope.link='';
      console.log($scope.posts)
    })
    //PRE BACKEND
    // var upvotes =(isNaN($scope.upvotes)) ? 0 : Number($scope.upvotes);
    // var comments = [{author:'Joe', body:'yo', upvotes:0}, {author:'Dick', body:'fu', upvotes:0}]
    //$scope.posts.push({title:title, link:link, upvotes:upvotes, comments:comments})
    //$scope.title=''; $scope.link=''; $scope.upvotes=0;
    // console.log($scope.posts)
  };
  $scope.incrementUpvotes = function(post) {
    postSvc.upvote(post);
    //PRE BACKEND   
    //post.upvotes+=1;
  }
}])

.controller('PostsCtrl', ['$scope', '$stateParams', 'postSvc', 'post', 'authSvc', function($scope, $stateParams, postSvc, post, authSvc){   //pass in resolved post
  $scope.post = post;
  $scope.isLoggedIn = authSvc.isLoggedIn();

  $scope.addComment = function(){
    if($scope.body === '') { return; }
    var newcomment = {
      body: $scope.body,
      author: 'user'
    }
    postSvc.addComment($scope.post._id, newcomment).then(function(){
      $scope.body = '';
      postSvc.getPost($scope.post._id).then(function(post){
        $scope.post = post;
      });
    });
  };
  $scope.incrementUpvotes = function(comment) {
    postSvc.upvoteComment($scope.post._id, comment);
  }
}])
