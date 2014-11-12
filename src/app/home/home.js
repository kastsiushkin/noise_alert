/**
 * Each section of the site has its own module. It probably also has
 * submodules, though this boilerplate is too simple to demonstrate it. Within
 * `src/app/home`, however, could exist several additional folders representing
 * additional modules that would then be listed as dependencies of this one.
 * For example, a `note` section could have the submodules `note.create`,
 * `note.delete`, `note.edit`, etc.
 *
 * Regardless, so long as dependencies are managed correctly, the build process
 * will automatically take take of the rest.
 *
 * The dependencies block here is also where component dependencies should be
 * specified, as shown below.
 */
angular.module( 'ngBoilerplate.home', [
  'ui.router'
])

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
.config(function config( $stateProvider ) {
  $stateProvider.state( 'home', {
    url: '/home',
    views: {
      "main": {
        controller: 'HomeCtrl',
        templateUrl: 'home/home.tpl.html'
      }
    },
    data:{ pageTitle: 'Home' }
  });
})

/**
 * And of course we define a controller for our route.
 */
.controller( 'HomeCtrl', function HomeController( $scope, sendHubService, $timeout, $window ) {
  $scope.addContactRequired = false;

  $scope.listen = function () {
    activateMicrophone();
  };

  function successGetContactId(ids) {
    $scope.processStatus = "Sending the message...";
    if ( ids.length > 0 ) {
      sendHubService.sendMessage(ids, $scope.text).then(successSendMessage);
    } else {
      $scope.processStatus = "Can't find the contact, please add it to your contact list";
      $scope.addContactRequired = true;
    }
  }

  function successSendMessage() {
    $scope.processStatus = "Your contact has been notified!";
    $timeout(function() {
      delete $scope.processStatus;
    }, 2000);
  }

  $scope.addContact = function () {
    $scope.processStatus = "Adding Contact...";
    sendHubService.addContact($scope.phone, $scope.name).then(successAddContact);
  };

  function successAddContact(response) {
    $scope.processStatus = "Contact added";
    $scope.addContactRequired = false;
    $scope.submitAlert();
  }

  function activateMicrophone() {
    var instantMeter = document.querySelector('#instant meter');
    var slowMeter = document.querySelector('#slow meter');
    var clipMeter = document.querySelector('#clip meter');

    var instantValueDisplay = document.querySelector('#instant .value');
    var slowValueDisplay = document.querySelector('#slow .value');
    var clipValueDisplay = document.querySelector('#clip .value');

    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      window.audioContext = new AudioContext();
    } catch (e) {
      alert('Web Audio API not supported.');
    }

    var constraints = window.constraints = {
      audio: true,
      video: false
    };

    navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    $scope.max1 = $scope.max2 = $scope.max3 = 0;
    $scope.sum = 0;

    //Calculations on successfull connection to mic
    function successCallback(stream) {
      window.stream = stream;
      $scope.soundMeter = new SoundMeter(window.audioContext);
      $scope.soundMeter.connectToSource(stream);
      var count = 0;
      var timer = setInterval(function() {
        updateMax($scope.soundMeter.instant);
        // 2.b
        if ( $scope.sum > 0 && $scope.max1 > 0 && $scope.max2 > 0 && $scope.max3 > 0 &&
           ($scope.sum == $scope.max1 || $scope.sum == $scope.max2 || $scope.sum == $scope.max3) ) {
          console.log("2b matched");
          //sendMessage(timer);
        }
        //Immediate volume is above threshold
        if ( $scope.soundMeter.instant > $scope.threshold ) {
          $scope.sum += $scope.soundMeter.instant * 0.1; //output = Σ (volume ∙ Δtime)
          $scope.sum = Math.round($scope.sum * 10000) / 10000;
          count++;
          // 2.a If above the threshold over a second
          if ( count === 10 ) {
            sendMessage(timer);
          }
        } else {
          //Reset count
          count = 0;
        }
      },100);
    }

    function errorCallback(error) {
      console.log("Error");
      console.log('navigator.getUserMedia error: ', error);
    }
    navigator.getUserMedia(constraints, successCallback, errorCallback);
  }

  function sendMessage (timer) {
    clearTimeout(timer);
    $scope.soundMeter.stop();
    $scope.processStatus = "Finding the contact...";
    sendHubService.getContactId($scope.phone).then(successGetContactId);
  }

  function updateMax (val) {
    //Update 3 max
    val = val * 0.1; //output = Σ (volume ∙ Δtime)
    val = Math.round(val * 10000) / 10000;
    if ( $scope.max1 < val ) {
      $scope.max3 = $scope.max2;
      $scope.max2 = $scope.max1;
      $scope.max1 = val;
    } else if ( $scope.max1 > val && $scope.max2 < val ) {
      $scope.max3 = $scope.max2;
      $scope.max2 = val;
    } else if ( $scope.max2 > val && $scope.max3 < val ) {
      $scope.max3 = val;
    }

    $scope.$apply();
  }
})

.factory('sendHubService', function ($http, $q, USERNAME, APIKEY) {

  return {

    getContactId: function (phone) {
      console.log(phone);
      var deferred = $q.defer();
      $http({
        method: 'GET',
        url: 'https://api.sendhub.com/v1/contacts/?username='+ USERNAME +'&api_key='+APIKEY,
        headers: {
          'Content-Type':'application/json'
        }
      })
      .success( function (response) {
        //Find id for the entered phone number
        var ids = [];
        for ( var i in response.objects ) {
          var contact = response.objects[i];
          if ( contact.number.indexOf(phone) != -1 ) {
            ids.push(contact.id_str);
          }
        }
        deferred.resolve(ids);
      })
      .error( function () {
        console.log("error", response);
        deferred.reject(response);
      });
      return deferred.promise;
    },

    addContact: function (phone, name) {
      var deferred = $q.defer(),
      formData = { 
        "number": phone,
        "name": name
      };
      console.log(formData);
      $http({
        method: 'POST',
        url: 'https://api.sendhub.com/v1/contacts/?username='+ USERNAME +'\\&api_key='+APIKEY,
        data:formData,
        headers:{
          'Content-Type':'application/json'
        }

      })
      .success(function (response) {
        console.log("success", response);
        deferred.resolve(response);
      })
      .error(function (response) {
        console.log("error", response);
        deferred.reject(response);
      });
      return deferred.promise;
    },

    sendMessage: function (ids, text) {
      var deferred = $q.defer(),
      formData = { 
        "contacts": ids,
        "text": text
      };
      console.log(formData);
      $http({
        method: 'POST',
        url: 'https://api.sendhub.com/v1/messages/?username='+ USERNAME +'\\&api_key='+APIKEY,
        data:formData,
        headers:{
          'Content-Type':'application/json'
        }

      })
      .success(function (response) {
        console.log("success", response);
        deferred.resolve(response);
      })
      .error(function (response) {
        console.log("error", response);
        deferred.reject(response);
      });
      return deferred.promise;
    }
  };

})

;

