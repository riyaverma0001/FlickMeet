// AppProcess handles WebRTC peer connection logic and media stream management
var AppProcess = (function () {
  // State variables for managing connections, streams, and media senders
  var peers_connection_ids = {};
  var peers_connection = [];
  var remote_vid_stream = [];
  var remote_aud_stream = [];
  var local_div;
  var serverProcess;
  var audio;
  var isAudioMute = true;
  var rtp_aud_senders = [];
  var video_states = {
    None: 0,
    Camera: 1,
    ScreenShare: 2,
  };
  var video_st = video_states.None;
  var videoCamTrack;
  var rtp_vid_senders = [];
  

  // Initialize AppProcess with SDP function and connection ID
  async function _init(SDP_function, my_connid) {
    console.log("Initializing AppProcess with connection ID:", my_connid);
    serverProcess = SDP_function;
    eventProcess();
    local_div = document.getElementById("localVideoPlayer");
  }

  // Set up event listeners for UI controls
  function eventProcess() {
    console.log("Setting up event listeners for UI controls.");
    document
      .getElementById("micMuteUnmute")
      .addEventListener("click", async function () {
        console.log("Mic mute/unmute button clicked.");
        if (!audio) {
          console.log("Audio not initialized. Attempting to load audio.");
          await loadAudio(); // Assuming loadAudio function is defined elsewhere
        }
        if (!audio) {
          alert("Audio permission has not been granted");
          return;
        }
        toggleAudioMute(this);
      });

    document
      .getElementById("videoCamOnOff")
      .addEventListener("click", async function () {
        console.log("Video camera on/off button clicked.");
        await toggleVideoCamera();
      });

    document
      .getElementById("ScreenShareOnOff")
      .addEventListener("click", async function () {
        console.log("Screen share on/off button clicked.");
        await toggleScreenShare();
      });
  }

  async function loadAudio() {
    try{
      var astream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      audio = astream.getAudioTracks()[0];
      audio.enabled = false;
    }catch(e) {
      console.log(e);
    }
  }

  // Toggle audio mute/unmute state
  function toggleAudioMute(button) {
    console.log("Toggling audio mute state. Current state:", isAudioMute);
    if (isAudioMute) {
      audio.enabled = true;
      button.innerHTML = "<span class='material-icons'>mic</span>";
      updateMediaSenders(audio, rtp_aud_senders);
      console.log("Audio unmuted.");
    } else {
      audio.enabled = false;
      button.innerHTML = "<span class='material-icons'>mic_off</span>";
      removeMediaSenders(rtp_aud_senders); // Assuming removeMediaSenders function is defined elsewhere
      console.log("Audio muted.");
    }
    isAudioMute = !isAudioMute;
  }

  // Toggle video camera on/off
  async function toggleVideoCamera() {
    console.log("Toggling video camera. Current state:", video_st);
    if (video_st === video_states.Camera) {
      await videoProcess(video_states.None);
      console.log("Video camera turned off.");
    } else {
      await videoProcess(video_states.Camera);
      console.log("Video camera turned on.");
    }
  }

  // Toggle screen sharing on/off
  async function toggleScreenShare() {
    console.log("Toggling screen sharing. Current state:", video_st);
    if (video_st === video_states.ScreenShare) {
      await videoProcess(video_states.None);
      console.log("Screen sharing stopped.");
    } else {
      await videoProcess(video_states.ScreenShare);
      console.log("Screen sharing started.");
    }
  }

  // Check if the connection status is valid
  function connection_status(connection) {
    const status =
      connection &&
      ["new", "connecting", "connected"].includes(connection.connectionState);
    console.log("Connection status:", status);
    return status;
  }

  // Update the media senders for each peer connection
  async function updateMediaSenders(track, rtp_senders) {
    console.log("Updating media senders for track:", track);
    for (let con_id in peers_connection_ids) {
      if (connection_status(peers_connection[con_id])) {
        if (rtp_senders[con_id] && rtp_senders[con_id].track) {
          console.log(`Replacing track for connection ID: ${con_id}`);
          rtp_senders[con_id].replaceTrack(track);
        } else {
          console.log(`Adding track for connection ID: ${con_id}`);
          rtp_senders[con_id] = peers_connection[con_id].addTrack(track);
        }
      } else {
        console.log(`Skipping connection ID: ${con_id} due to invalid status.`);
      }
    }
  }

  function removeMediaSenders(rtp_senders) {
    for( var con_id in peers_connection_ids) {
      if(rtp_senders[con_id] && connection_status(peers_connection[con_id])) {
          peers_connection[con_id].removeTrack(rtp_senders[con_id]);
          rtp_senders[con_id] = null;
      }
    }
  }
  function removeVideoStream(rtp_vid_senders) {
    if(videoCamTrack) {
      videoCamTrack.stop();
      videoCamTrack = null;
      local_div.srcObject = null;
      console.log("Video camera stopped.");
      removeMediaSenders(rtp_vid_senders);
    }
  }

  // Handle the video stream processing (Camera/ScreenShare)
  async function videoProcess(newVideoState) {
    console.log("Processing video state change to:", newVideoState);
    console.log(local_div);

    if (newVideoState === video_states.None) {
  // Get the element by ID
  const videoCamOnOffElement = document.getElementById('videoCamOnOff');
  // Update the inner HTML of the element
  videoCamOnOffElement.innerHTML = "<span class='material-icons'>videocam_off</span>";

  // const screenShareElement = document.getElementById('ScreenShareOnOff');
  // screenShareElement.innerHTML = '<span class="material-icons" style="color: black; background-color: white;">present_to_all</span><div style="color: black; background-color: white;">Present Now</div>'
  // Update the video state
  
  // Select the element with the ID 'ScreenShareOnOff'
var element = document.getElementById('ScreenShareOnOff');

// Set the innerHTML of the selected element
element.innerHTML = '<span class="material-icons" style="color: black; background-color: white;">present_to_all</span><div style="color: black; background-color: white;">Present Now</div>';

  video_st = newVideoState;

  // Call the function to remove the video stream
  removeVideoStream(rtp_vid_senders);
  return;
}

if (newVideoState === video_states.Camera) {
  // Get the element by ID
  const videoCamOnOffElement = document.getElementById('videoCamOnOff');
  // Update the inner HTML of the element
  videoCamOnOffElement.innerHTML = "<span class='material-icons' style='width: 75%'>videocam_on</span>";
}
    try {
      let vstream = null;
      if (newVideoState === video_states.Camera) {
        console.log("Accessing camera for video stream.");
        vstream = await navigator.mediaDevices.getUserMedia({
          video: {
             width: 1920, 
             height: 1080 
            },
          audio: false,
        });
      } else if (newVideoState === video_states.ScreenShare) {
        console.log("Accessing screen for video stream.");
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: false,
        });
        vstream.oninactive = (e) => {
          removeVideoStream(rtp_vid_senders);
          var screenShareOnOffElement = document.getElementById('ScreenShareOnOff');
          screenShareOnOffElement.innerHTML = '<span class="material-icons" style="color: black; background-color: white;">present_to_all</span><div style="color: black; background-color: white;">Present Now</div>';

        }
      }

      if (vstream && vstream.getVideoTracks().length > 0) {
        videoCamTrack = vstream.getVideoTracks()[0];
        local_div.srcObject = new MediaStream([videoCamTrack]);
        console.log("Updated local video stream.");
        updateMediaSenders(videoCamTrack, rtp_vid_senders);
      } else {
        console.log("No video tracks found in the stream.");
      }
    } catch (e) {
      console.error("Error during video processing:", e);
    }
    video_st = newVideoState;


   // Assuming video_states is an object defined elsewhere in your code
var videoCamOnOffElement = document.getElementById('videoCamOnOff');
var screenShareOnOffElement = document.getElementById('ScreenShareOnOff');

if (newVideoState === video_states.Camera) {
    // Update the content of #videoCamOnOff
    videoCamOnOffElement.innerHTML = '<span class="material-icons">videocam</span>';

    // Update the content of #ScreenShareOnOff
    screenShareOnOffElement.innerHTML = '<span class="material-icons" style="color: black; background-color: white;">present_to_all</span><div style="color: black; background-color: white;">Present Now</div>';
} else if (newVideoState === video_states.ScreenShare) {
    // Update the content of #videoCamOnOff
    videoCamOnOffElement.innerHTML = '<span class="material-icons">videocam_off</span>';

    // Update the content of #ScreenShareOnOff
    screenShareOnOffElement.innerHTML = '<span class="material-icons text-success" style="color: black; background-color: white;">present_to_all</span><div class="text-success" style="color: black; background-color: white;">Stop Present Now</div>';
}

  }

  // ICE configuration for peer connections
  var iceConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Set up a new peer connection
  async function setConnection(connid) {
    console.log("Setting up new peer connection for connId:", connid);
    try {
      var connection = new RTCPeerConnection(iceConfiguration);

      connection.onnegotiationneeded = async function () {
        console.log("Negotiation needed for connId:", connid);
        await setOffer(connid);
      };

      connection.onicecandidate = function (event) {
        if (event.candidate) {
          console.log("Sending ICE candidate to connId:", connid);
          serverProcess(
            JSON.stringify({ iceCandidate: event.candidate }),
            connid
          );
        }
      };

      connection.ontrack = function (event) {
        console.log("Received remote track from connId:", connid);
        handleRemoteStream(event, connid);
      };

      peers_connection_ids[connid] = connid;
      peers_connection[connid] = connection;

      if (
        video_st === video_states.Camera ||
        video_st === video_states.ScreenShare
      ) {
        if (videoCamTrack) {
          console.log("Adding video track to connection:", connid);
          updateMediaSenders(videoCamTrack, rtp_vid_senders);
        }
      }

      return connection;
    } catch (e) {
      console.error("Error setting up peer connection:", e);
    }
  }

  // Handle remote video/audio streams
  function handleRemoteStream(event, connid) {
    console.log("Handling remote stream for connId:", connid);
    if (!remote_vid_stream[connid]) {
      remote_vid_stream[connid] = new MediaStream();
    }
    if (!remote_aud_stream[connid]) {
      remote_aud_stream[connid] = new MediaStream();
    }

    if (event.track.kind === "video") {
      remote_vid_stream[connid]
        .getVideoTracks()
        .forEach((t) => remote_vid_stream[connid].removeTrack(t));
      remote_vid_stream[connid].addTrack(event.track);
      var remoteVideoPlayer = document.getElementById("v_" + connid);
      if (remoteVideoPlayer) {
        remoteVideoPlayer.srcObject = remote_vid_stream[connid];
        console.log("Updated remote video stream for connId:", connid);
      } else {
        console.error("Remote video element not found for connId:", connid);
      }
    } else if (event.track.kind === "audio") {
      remote_aud_stream[connid]
        .getAudioTracks()
        .forEach((t) => remote_aud_stream[connid].removeTrack(t));
      remote_aud_stream[connid].addTrack(event.track);
      var remoteAudioPlayer = document.getElementById("a_" + connid);
      if (remoteAudioPlayer) {
        remoteAudioPlayer.srcObject = remote_aud_stream[connid];
        console.log("Updated remote audio stream for connId:", connid);
      } else {
        console.error("Remote audio element not found for connId:", connid);
      }
    }
  }

  // Create and send an SDP offer
  async function setOffer(connid) {
    console.log("Creating SDP offer for connId:", connid);
    try {
      var connection = peers_connection[connid];
      var offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      serverProcess(
        JSON.stringify({ offer: connection.localDescription }),
        connid
      );
      console.log("Sent SDP offer to connId:", connid);
    } catch (e) {
      console.error("Error creating SDP offer:", e);
    }
  }

  // Process incoming SDP messages
  async function SDPProcess(message, from_connid) {
    console.log("Processing SDP message from connId:", from_connid);
    message = JSON.parse(message);

    if (message.answer) {
      console.log("Received SDP answer from connId:", from_connid);
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    } else if (message.offer) {
      console.log("Received SDP offer from connId:", from_connid);
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      var answer = await peers_connection[from_connid].createAnswer();
      await peers_connection[from_connid].setLocalDescription(answer);
      serverProcess(JSON.stringify({ answer: answer }), from_connid);
      console.log("Sent SDP answer to connId:", from_connid);
    } else if (message.iceCandidate) {
      console.log("Adding ICE candidate for connId:", from_connid);
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      try {
        await peers_connection[from_connid].addIceCandidate(
          message.iceCandidate
        );
        console.log("Added ICE candidate for connId:", from_connid);
      } catch (e) {
        console.error("Error adding ICE candidate for connId:", from_connid, e);
      }
    }
  }

  async function closeConnection(connid) {
    peers_connection_ids[connid] = null;
    if (peers_connection[connid]) {
      peers_connection[connid].close();
      peers_connection[connid] = null;
    }
    if(remote_aud_stream[connid]) {
      remote_aud_stream[connid].getTracks().forEach((t)=> {
        if(t.stop)  t.stop();
      })
      remote_aud_stream[connid] = null;
    }
    if(remote_vid_stream[connid]) {
      remote_vid_stream[connid].getTracks().forEach((t)=> {
        if(t.stop) 
          t.stop();
      })
      remote_vid_stream[connid] = null;
      
    }
  }

  // async function closeConnection(connid) {
  //   // Nullify connection ID reference
  //   peers_connection_ids[connid] = null;
  
  //   // Close and nullify peer connection
  //   if (peers_connection[connid]) {
  //     try {
  //       peers_connection[connid].close();
  //     } catch (error) {
  //       console.error('Error closing peer connection:', error);
  //     } finally {
  //       peers_connection[connid] = null;
  //     }
  //   }
  
  //   // Stop remote audio stream tracks and nullify the stream
  //   if (remote_aud_stream[connid]) {
  //     try {
  //       remote_aud_stream[connid].getTracks().forEach((track) => {
  //         if (track.stop) {
  //           track.stop();
  //         }
  //       });
  //     } catch (error) {
  //       console.error('Error stopping audio tracks:', error);
  //     } finally {
  //       remote_aud_stream[connid] = null;
  //     }
  //   }
  
    // Stop remote video stream tracks and nullify the stream
  //   if (remote_vid_stream[connid]) {
  //     try {
  //       remote_vid_stream[connid].getTracks().forEach((track) => {
  //         if (track.stop) {
  //           track.stop();
  //         }
  //       });
  //     } catch (error) {
  //       console.error('Error stopping video tracks:', error);
  //     } finally {
  //       remote_vid_stream[connid] = null;
  //     }
  //   }
  // }
  
  // Public API exposed by AppProcess
  return {
    setConnection: async function (connid) {
      return await setConnection(connid);
    },
    init: async function (SDP_function, my_connid) {
      await _init(SDP_function, my_connid);
    },
    processClientFunc: async function (data, from_connid) {
      await SDPProcess(data, from_connid);
    },
    closeConnectionCall: async function (connid) {
      await closeConnection(connid);
    },
  };
})();

// MyApp handles the main app initialization and signaling server communication
var MyApp = (function () {
  var socket = null;
  var user_id = "";
  var meeting_id = "";

  // Initialize MyApp with user ID and meeting ID
  function init(uid, mid) {
    user_id = uid;
    meeting_id = mid;
    document.getElementById("meetingContainer").style.display = "block";

    var h2Element = document.querySelector("#me h2");
    if (h2Element) {
      h2Element.textContent = user_id + " (Me)";
    }
    document.title = user_id;
    console.log(
      "Initializing MyApp for user:",
      user_id,
      "in meeting:",
      meeting_id
    );
    eventProcessForSignalingServer();
    eventHandling();
  }

  // Set up event listeners for socket communication
  function eventProcessForSignalingServer() {
    console.log("Setting up event listeners for signaling server.");
    socket = io().connect();

    // Function to process SDP messages
    var SDP_function = function (data, to_connid) {
      console.log("Sending SDP process message to connId:", to_connid);
      socket.emit("SDPProcess", {
        message: data,
        to_connid: to_connid,
      });
    };

    socket.on("connect", function () {
      console.log("Socket connected. ID:", socket.id);
      if (socket.connected) {
        AppProcess.init(SDP_function, socket.id);
        if (user_id && meeting_id) {
          console.log("Notifying server about user connection.");
          socket.emit("userconnect", {
            displayName: user_id,
            meetingid: meeting_id,
          });
        }
      }
    });

    socket.on("inform_other_about_disconnected_user", function(data) {
      console.log("Received inform_other_about_disconnected_user event.");
     
      // Select the element with the ID from data.connId
      var element = document.getElementById(data.connId);

      // Remove the selected element from the DOM
      if (element) {
          element.parentNode.removeChild(element);
      }

    console.log('User Number:', data.userNumber);
console.log('Connection ID:', data.connId);

// Update participant count
const participantCountElements = document.querySelectorAll('.participant-count');
console.log('Number of participant-count elements:', participantCountElements.length);
participantCountElements.forEach(element => {
    console.log('Updating element:', element);
    element.textContent = data.userNumber;
});

// Remove the participant element
const elementToRemove = document.getElementById(`participant_${data.connId}`);
console.log('Element to remove:', elementToRemove);
if (elementToRemove) {
    elementToRemove.remove();
} else {
    console.log('Element not found for removal');
}

      AppProcess.closeConnectionCall(data.connId);
    })
    socket.on("inform_others_about_me", function (data) {
      console.log(
        "Informed others about me. Other user ID:",
        data.other_user_id
      );
      addUser(data.other_user_id, data.connId, data.userNumber);
      AppProcess.setConnection(data.connId);
    });
    socket.on("showFileMessage", function(data) {
      var time =new Date();
      var lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
      })
      var attachFileAreaForOther = document.querySelector(".show-attach-file");

      attachFileAreaForOther.innerHTML += "<div  class='left-align' style='display:flex; align-items:center;'><img src='public/Assets/images/Flickmeet/man.png' style='height:40px; width:40px;' class='caller-image circle'><div style='font-weight:600;margin:0 5px;'>"+data.username+"</div>:<div><a style='color:#007bff;' href='"+data.filePath+"' download>"+data.fileName+"</a></div></div><br>";
    })

    socket.on("inform_me_about_other_users", function (other_users) {
      console.log("Informed about other users in the meeting.");
      var userNumber = other_users.length;
      var userNumb = userNumber + 1;
      if (other_users) {
        for (let user of other_users) {
          console.log(
            "Adding user:",
            user.user_id,
            "with connId:",
            user.connectionId
          );
          addUser(user.user_id, user.connectionId, userNumb);
          AppProcess.setConnection(user.connectionId);
        }
      }
    });

    socket.on("SDPProcess", async function (data) {
      console.log("Received SDP process message.");
      await AppProcess.processClientFunc(data.message, data.from_connid);
    });

    socket.on("showChatMessage", function(data) {
      var time = new Date();
      var lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
      })
      var div = document.createElement("div");
  
      // Create a new span element
      var span = document.createElement("span");
      span.className = "font-weight-bold mr-3 ";
      // span.style.color = "black";
      span.textContent = data.from;
        
      // Create a line break element
      var br = document.createElement("br");
        
      // Set the inner HTML of the div
      div.appendChild(span);
      div.appendChild(br);
      div.innerHTML += lTime + "</br>" + data.message;
        
      //Now `div` contains the constructed HTML
  
      // Assuming `div` is the newly created div element
  
      // Select the target element (messages)
      var messages = document.querySelector("#messages");
        
      // Append the newly created div to the target element
      messages.appendChild(div);
    })
  }


  function eventHandling() {
    // Add event listeners for the messaging system
    // Select the button and message box elements
      const btnSend = document.querySelector("#btnsend");
      const msgBox = document.querySelector("#msgbox");

      // Add event listener to the button
      btnSend.addEventListener("click", function() {

        var msgData = document.querySelector("#msgbox").value;
        // Emit the message using the socket
        socket.emit("sendMessage", msgData);

        var time = new Date();
      var lTime = time.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
      })
      var div = document.createElement("div");
  

      // Create a new span element
      var span = document.createElement("span");
      span.className = "font-weight-bold mr-3";
      // span.style.color = "black";
      span.textContent = user_id;
        
      // Create a line break element
      var br = document.createElement("br");
        
      // Set the inner HTML of the div
      div.appendChild(span);
      div.appendChild(br);
      div.innerHTML += lTime + "</br>" + msgData;
        
      //Now `div` contains the constructed HTML
  
      // Assuming `div` is the newly created div element
  
      // Select the target element (messages)
      var messages = document.querySelector("#messages");
        
      // Append the newly created div to the target element
      messages.appendChild(div);
        // Clear the message box
        msgBox.value = "";
      });

      //meeting details pr click krke box open hona
      document.querySelector('.meeting-details-button').addEventListener('click', function() {
        var details = document.querySelector('.g-details');
        if (details.style.display === 'none' || details.style.display === '') {
            // Get the natural height of the element
            details.style.display = 'block';
            var fullHeight = details.scrollHeight + 'px';
            
            // Set the height to 0 and transition to full height
            details.style.height = '0px';
            setTimeout(function() {
                details.style.height = fullHeight;
            }, 10); // Slight delay to trigger transition
            
        } else {
            // Collapse the element
            details.style.height = '0px';
            setTimeout(function() {
                details.style.display = 'none';
            }, 100); // Delay to match the transition duration
        }
    });


    //dbl click krke vdo zom hona
      document.getElementById('localVideoPlayer').addEventListener('dblclick', function() {
        if (this.requestFullscreen) {
            this.requestFullscreen();
        } else if (this.mozRequestFullScreen) { // Firefox
            this.mozRequestFullScreen();
        } else if (this.webkitRequestFullscreen) { // Chrome, Safari, Opera
            this.webkitRequestFullscreen();
        } else if (this.msRequestFullscreen) { // IE/Edge
            this.msRequestFullscreen();
        }
    });

    const toggleButton = document.querySelector('.g-details-heading-attachment');
    const detailsToHide = document.querySelector('.g-details-heading-show');
    const detailsToShow = document.querySelector('.g-details-heading-show-attachment');

    // Add click event listener to the toggle button
    toggleButton.addEventListener('click', () => {
        // Toggle visibility
        if (detailsToHide.style.display === 'none') {
            detailsToHide.style.display = 'block';
            detailsToShow.style.display = 'none';
        } else {
            detailsToHide.style.display = 'none';
            detailsToShow.style.display = 'block';
        }
      //   document.querySelectorAll('.g-details-heading-attachment').forEach(element => {
      //     element.classList.add('active');
      // });
      
      // // Remove 'active' class from elements with class 'g-details-heading-detail'
      // document.querySelectorAll('.g-details-heading-detail').forEach(element => {
      //     element.classList.remove('active');
      // });
    });

    const toggleButton2 = document.querySelector('.g-details-heading-detail');
    const detailsToShow2 = document.querySelector('.g-details-heading-show');
    const detailsToHide2 = document.querySelector('.g-details-heading-show-attachment');

    // Add click event listener to the toggle button
    toggleButton2.addEventListener('click', () => {
        // Show the content to show and hide the content to hide
        detailsToShow2.style.display = 'block';
        detailsToHide2.style.display = 'none';

    //     document.querySelector('.g-details-heading-detail').forEach(element => {
    //       element.classList.add('active');
    //   });
      
    //   // Remove 'active' class from elements with class 'g-details-heading-detail'
    //   document.querySelector('.g-details-heading-attachment').forEach(element => {
    //       element.classList.remove('active');
    //   });
    });


    //rec. show 
// document.querySelector('.option-icon').addEventListener('click', function() {
//   var recShow = document.querySelector('.recording-show');
//   recShow.style.display = 'block';
// });

// document.querySelector('.start-record').addEventListener('click', function() {
//             var recShow = document.querySelector('.recording-show');
//             recShow.style.display = 'block';
//         });


// $(document).on("click", ".start-record" , function() {
// $(this).removeClass().addClass("stop-record btn-danger text-dark").text("Stop Recording");
// startRecording();
// });
// $(document).on("click", ".stop-record" , function() {
// $(this).removeClass().addClass("start-record btn-dark text-danger").text("Start Recording");
// mediaRecorder.stop();
// });

// Handle the click event for start-record button
// document.addEventListener('click', function(event) {
//   // Check if the clicked element has the class 'start-record'
//   if (event.target.classList.contains('start-record')) {
//     // Remove the 'start-record' class and add new classes
//     event.target.classList.remove('start-record');
//     event.target.classList.add('stop-record', 'btn-danger', 'text-dark');
//     // Change the text content of the button
//     event.target.textContent = 'Stop Recording';
//     // Start recording
//     startRecording();
//   }
// });

// Handle the click event for stop-record button
// document.addEventListener('click', function(event) {
//   // Check if the clicked element has the class 'stop-record'
//   if (event.target.classList.contains('stop-record')) {
//     // Remove the 'stop-record' class and add new classes
//     event.target.classList.remove('stop-record');
//     event.target.classList.add('start-record', 'btn-dark', 'text-danger');
//     // Change the text content of the button
//     event.target.textContent = 'Start Recording';
//     // Stop recording
//     if (typeof mediaRecorder !== 'undefined') {
//       mediaRecorder.stop();
//     }
//   }
// });


// var mediaRecorder;
// var chunks = [];

// async function captureScreen(mediaConstraints = {
//   video: true
// }) {
//   const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints)
//   return screenStream;
// }
// async function captureAudio(mediaConstraints = {
//   video: false,
//   audio: true
// }) {
//   const audioStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
//   return audioStream;
// }

// async function startRecording() {
// const screenStream = await captureScreen();
// const audioStream = await captureAudio();
// const stream = new MediaStream([...screenStream.getTracks(), ...audioStream.getTracks()])

// mediaRecorder = new MediaRecorder(stream);
// mediaRecorder.start();

// mediaRecorder.onstop = function(e) {
//   var clipName = prompt("Enter a name for your Recording")
//   console.log('recording stopped');
//   stream.getTracks().forEach((track)=> track.stop());
//   const blob = new Blob(chunks,{
//     type: "video/webm",
//   } )
//   const url = window.URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.style.display = 'none';
//   a.href = url;
//   a.download = clipName +".webm";
//   document.body.appendChild(a);
//   a.click();
//   setTimeout(()=> {
//     document.body.removeChild(a);
//     window.URL.revokeObjectURL(url);
//   }, 100)
// }
// mediaRecorder.ondataavailable = (e) => {
//   chunks.push(e.data);
// }
// }
// var mediaRecorder;
// var chunks = [];

// // Handle the click event for start-record button
// document.addEventListener('click', function(event) {
//   if (event.target.classList.contains('start-record')) {
//     event.target.classList.remove('start-record');
//     event.target.classList.add('stop-record', 'btn-danger', 'text-dark');
//     event.target.textContent = 'Stop Recording';
//     startRecording().catch(err => console.error('Error starting recording:', err));
//   }
// });

// // Handle the click event for stop-record button
// document.addEventListener('click', function(event) {
//   if (event.target.classList.contains('stop-record')) {
//     event.target.classList.remove('stop-record');
//     event.target.classList.add('start-record', 'btn-dark', 'text-danger');
//     event.target.textContent = 'Start Recording';
//     if (mediaRecorder && mediaRecorder.state !== 'inactive') {
//       mediaRecorder.stop();
//     } else {
//       console.error('MediaRecorder is not initialized or already stopped.');
//     }
//   }
// });

// async function captureScreen(mediaConstraints = { video: true }) {
//   try {
//     const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints);
//     return screenStream;
//   } catch (err) {
//     console.error('Error capturing screen:', err);
//   }
// }

// async function captureAudio(mediaConstraints = { video: false, audio: true }) {
//   try {
//     const audioStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
//     return audioStream;
//   } catch (err) {
//     console.error('Error capturing audio:', err);
//   }
// }

// async function startRecording() {
//   try {
//     const screenStream = await captureScreen();
//     const audioStream = await captureAudio();
//     const stream = new MediaStream([...screenStream.getTracks(), ...audioStream.getTracks()]);

//     mediaRecorder = new MediaRecorder(stream);
//     mediaRecorder.start();
//     console.log('Recording started');

//     mediaRecorder.onstop = function(e) {
//       console.log('Recording stopped');
//       stream.getTracks().forEach(track => track.stop());
//       const blob = new Blob(chunks, { type: 'video/webm' });
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.style.display = 'none';
//       a.href = url;
//       a.download = (prompt("Enter a name for your Recording") || 'recording') + '.webm';
//       document.body.appendChild(a);
//       a.click();
//       setTimeout(() => {
//         document.body.removeChild(a);
//         window.URL.revokeObjectURL(url);
//       }, 100);
//     };

//     mediaRecorder.ondataavailable = (e) => {
//       chunks.push(e.data);
//     };

//     mediaRecorder.onerror = (e) => {
//       console.error('MediaRecorder error:', e);
//     };

//   } catch (err) {
//     console.error('Error in startRecording:', err);
//   }
// }

  }

  

  // Add a new user to the user interface
  function addUser(other_user_id, connId, userNumb) {
    console.log(
      "Adding user to the UI:",
      other_user_id,
      "with connId:",
      connId
    );
    var template = document.getElementById("otherTemplate");

    if (!template) {
      console.error("Template element not found.");
      return;
    }

    var newDivId = template.cloneNode(true);
    newDivId.id = connId;
    newDivId.classList.add("other");

    var h2Element = newDivId.querySelector("h2");
    if (h2Element) {
      h2Element.textContent = other_user_id;
    }

    var videoElement = newDivId.querySelector("video");
    if (videoElement) {
      videoElement.id = "v_" + connId;
    }

    var audioElement = newDivId.querySelector("audio");
    if (audioElement) {
      audioElement.id = "a_" + connId;
    }

    newDivId.style.display = "block";

    var divUsers = document.getElementById("divUsers");
    if (divUsers) {
      divUsers.appendChild(newDivId);
      console.log("User added to the UI successfully.");
    } else {
      console.error("Container for users not found.");
    }
    
    // Create the elements
const inCallWrapUp = document.querySelector('.in-call-wrap-up');

const divInCallWrap = document.createElement('div');
divInCallWrap.className = 'in-call-wrap d-flex justify-content-between align-items-center mb-3';
divInCallWrap.id = `participant_${connId}`;

const divParticipantImgNameWrap = document.createElement('div');
divParticipantImgNameWrap.className = 'participant-img-name-wrap display-center';
divParticipantImgNameWrap.style.cursor = 'pointer';

const divParticipantImg = document.createElement('div');
divParticipantImg.className = 'participant-img';

const img = document.createElement('img');
img.src = 'public/Assets/images/Flickmeet/man.png';
img.alt = '';
img.className = 'border border-secondary';
img.style.height = '40px';
img.style.width = '40px';
img.style.borderRadius = '50%';

divParticipantImg.appendChild(img);

const divParticipantName = document.createElement('div');
divParticipantName.className = 'participant-name ml-2';
divParticipantName.textContent = other_user_id;

divParticipantImgNameWrap.appendChild(divParticipantImg);
divParticipantImgNameWrap.appendChild(divParticipantName);

const divParticipantActionWrap = document.createElement('div');
divParticipantActionWrap.className = 'participant-action-wrap display-center';

const divParticipantActionDot = document.createElement('div');
divParticipantActionDot.className = 'participant-action-dot display-center mr-2';
divParticipantActionDot.style.cursor = 'pointer';

const spanMoreVert = document.createElement('span');
spanMoreVert.className = 'material-icons';
spanMoreVert.textContent = 'more_vert';

divParticipantActionDot.appendChild(spanMoreVert);

const divParticipantActionPin = document.createElement('div');
divParticipantActionPin.className = 'participant-action-pin display-center mr-2';
divParticipantActionPin.style.cursor = 'pointer';

const spanPushPin = document.createElement('span');
spanPushPin.className = 'material-icons';
spanPushPin.textContent = 'push_pin';

divParticipantActionPin.appendChild(spanPushPin);

divParticipantActionWrap.appendChild(divParticipantActionDot);
divParticipantActionWrap.appendChild(divParticipantActionPin);

divInCallWrap.appendChild(divParticipantImgNameWrap);
divInCallWrap.appendChild(divParticipantActionWrap);

inCallWrapUp.appendChild(divInCallWrap);

// Select the element with the class 'participant-count'
const participantCountElements = document.querySelectorAll('.participant-count');

// Update its text content with the value of userNumb
participantCountElements.forEach(element => {
  element.textContent = userNumb;
});
  }

// $(document).on("click", ".option-icon", function() {
//   $(".recording-show").toggle(300);
// })

// $(document).on("click", ".option-icon", function() {
//   $(".recording-show").toggle(300);
// })



  // Public API exposed by MyApp
  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();