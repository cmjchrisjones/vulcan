﻿'use strict';

let avEnabled = true;

$(document).ready(() => {
  $('#message').addClass(hidden);
});

fetch('/socketio')
  .then(response => {
    return response.json();
  })
  .then(payload => {
    const socket = io.connect(payload.socketIOUrl);
    socket.on('onAnnouncement', newAnnouncementEventArg => {
      const user = newAnnouncementEventArg.user;
      const msg = newAnnouncementEventArg.message;
      addAndStart(msg, undefined, user.profile_image_url, 10, 'purple');
    });

    socket.on('onCheer', newCheerEventArg => {
      const displayName =
        newCheerEventArg.user.display_name || cheerer.user.login;
      const msg = `${displayName} just cheered ${newCheerEventArg.userstate.bits} bits`;
      addAndStart(msg, 'applause', newCheerEventArg.user.profile_image_url, 10);
    });

    socket.on('onRaid', newRaidEventArg => {
      const user = newRaidEventArg.user;
      const displayName = user.display_name || user.login;
      const msg = `DEFEND! ${displayName} is raiding with ${newRaidEventArg.viewers} accomplices!`;
      if (user.raidAlert) {
        addAndStart(msg, user.raidAlert, user.profile_image_url, 10, 'red');
      } else {
        addAndStart(msg, 'goodbadugly', user.profile_image_url, 10, 'red');
      }
    });

    socket.on('onSubscription', newSubscriptionEventArg => {
      const user = newSubscriptionEventArg.user;
      const displayName = user.display_name || user.login;
      const cumulativeMonths = newSubscriptionEventArg.cumulativeMonths;
      let msg = '';
      if (cumulativeMonths > 1) {
        msg = `${displayName}'s been in the club for ${cumulativeMonths} months! How's that hairline?`;
      } else {
        msg = `Welcome to the club ${displayName}!`;
      }
      addAndStart(msg, 'hair', user.profile_image_url, 10);
    });

    socket.on('onFollow', newFollowerEventArg => {
      const follower = newFollowerEventArg.user;
      const displayName = follower.display_name || follower.login;
      const msg = `Welcome ${displayName}! Thanks for following!`;
      addAndStart(msg, 'ohmy', follower.profile_image_url, 10);
    });

    socket.on('stopAudio', () => {
      container.innerHTML = '';
      audioQueue = [];
    });

    socket.on('avStateChanged', isEnabled => {
      avEnabled = isEnabled;
    });
  });

let messageQueue = [];
let audioQueue = [];

const intro = 'bounceInLeft';
const outro = 'bounceOutLeft';
const hidden = 'hid';
let isActive = false;

const messageObj = document.getElementById('message');
const userObj = $('.user');
const messageBody = document.getElementById('messageBody');
const profileImg = document.getElementById('profileImageUrl');

function addAndStart(m, a, p, t, c) {
  messageQueue.push({
    message: m,
    audio: a,
    profileImageUrl: p,
    timeout: t,
    class: c
  });
  if (isActive == false) {
    processMessage(messageQueue[0], false);
  }
}

function processMessage(qItem, bypass) {
  if (isActive == true && bypass == false) {
    return;
  }

  isActive = true;

  messageObj.classList.remove(hidden);
  messageObj.classList.remove(outro);

  if (qItem.profileImageUrl) {
    profileImg.src = qItem.profileImageUrl;
    profileImg.classList.remove('hidden');
  } else {
    profileImg.classList.add('hidden');
  }

  if (qItem.class) {
    userObj.addClass(qItem.class);
  } else {
    userObj.removeClass('purple');
    userObj.removeClass('red');
  }

  messageBody.innerHTML = qItem.message;

  messageObj.classList.add(intro);

  // Emit playAudio if needed
  if (qItem.audio && qItem.audio.length > 0) {
    playAudio(qItem.audio);
  }

  messageQueue.splice(0, 1);

  qItem.timeout * 1000;
  $('.timer').attr('style', 'width:100%');

  $('.timer').animate(
    {
      width: '0px'
    },
    qItem.timeout * 1000
  );

  setTimeout(() => {
    messageObj.classList.remove(intro);
    messageObj.classList.add(outro);

    setTimeout(() => {
      profileImg.src = '';
      messageBody.innerHTML = '';

      if (messageQueue.length > 0) {
        processMessage(messageQueue[0], true);
      } else {
        isActive = false;
      }
    }, 2000);
  }, qItem.timeout * 1000);
}

const _audioPath = '/assets/audio/clips/';
const container = document.getElementById('container');
const playNext = new CustomEvent('playNext', {
  bubbles: true
});

function playAudio(clipName) {
  if (avEnabled) {
    var audio = document.createElement('audio');
    audio.src = `${_audioPath}${clipName}.mp3`;
    audio.id = +new Date();
    audio.addEventListener('ended', audioStop, false);

    if (container.childElementCount > 0) {
      audioQueue.push(audio);
    } else {
      container.appendChild(audio);
      let playPromise = audio.play().catch(error => {
        throw error;
      });
    }
  }
}

function playQueue() {
  if (audioQueue.length > 0) {
    let audio = audioQueue.shift();
    container.appendChild(audio);
    let playPromise = audio.play().catch(error => {
      throw error;
    });
  }
}

function audioStop(e) {
  e.srcElement.dispatchEvent(playNext);
  e.srcElement.remove();
}
