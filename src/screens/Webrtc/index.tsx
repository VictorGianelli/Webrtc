import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';

import {
  EventOnAddStream,
  MediaStream,
  RTCView,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription
} from 'react-native-webrtc';
import Utils from '../../../Utils';
import { Button } from '../../components/Button';
import { GettingCall } from '../../components/GettingCall';
import Video from '../../components/Video';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const configuration = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };

export default function Webrtc() {
  const [localStream, setLocalStream] = useState<MediaStream | null>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>();
  const [gettingCall, setGettingCall] = useState(false);
  const pc = useRef<RTCPeerConnection>();
  const connecting = useRef(false);

  useEffect(() => {
    const cRef = firestore().collection('meet').doc('chatId');

    const subscribe = cRef.onSnapshot((snapshot) => {
      const data = snapshot.data();

      // on answer start the call
      if (pc.current && !pc.current.remoteDescription && data && data.answer) {
        pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      // If there is offerfor chatId set the getting call flag
      if (data && data.offer && !connecting.current) {
        setGettingCall(true);
      }
    })

    // On Delete of collection call hangup
    // The other side has cliked on hangup
    const subscribeDelete = cRef.collection('callee').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type == 'removed') {
          hangup();
        }
      })
    });
    return () => {
      subscribe();
      subscribeDelete();
    }

  }, []);// TODO


  const setupWebrtc = async () => {
    pc.current = new RTCPeerConnection(configuration);

    // Get the audio and video stream for the call
    const stream = await Utils.getStream();
    if (stream) {
      setLocalStream(stream);
      pc.current.addStream(stream);
    }

    // Get the remote stream once it is avaliable
    pc.current.onaddstream = (event: EventOnAddStream) => {
      setRemoteStream(event.stream);
    }
  };
  const create = async () => {
    console.log("Calling");
    connecting.current = true;

    // setup webrtc
    await setupWebrtc();

    // Document for the call
    const cRef = firestore().collection("meet").doc('chatid');

    // Exchange the ICE candidates betwen the caller and callee
    collectIceCandidates(cRef, "caller", "callee");

    if (pc.current) {
      // Create the offer for the call
      // Store the offer under the document
      const offer = await pc.current.createOffer();
      pc.current.setLocalDescription(offer);

      const cWithOffer = {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      };

      cRef.set(cWithOffer);
    }
  };
  const join = async () => {
    console.log("Login the call");
    connecting.current = true;
    setGettingCall(false);

    // Document for the call
    const cRef = firestore().collection('meet').doc('chatid');
    const offer = (await cRef.get()).data()?.offer;

    if (offer) {

      // setup webrtc
      await setupWebrtc();

      // Exchange the ICE candidates 
      // check the parameters, It's reversed. Since the joning part is callee
      collectIceCandidates(cRef, "callee", "caller");

      if (pc.current) {
        pc.current.setRemoteDescription(new RTCSessionDescription(offer));

        // Create the answer for the call
        // Update the document with answer
        const answer = await pc.current.createAnswer();
        pc.current.setLocalDescription(answer);

        const cWithAnswer = {
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
        };

        cRef.update(cWithAnswer);
      }
    }
  };

  /** 
   * For disconnecting the call close the connection, release rhe stream
   * And delete the document for the call
   * */
  const hangup = async () => {
    setGettingCall(false);
    connecting.current = false;
    streamCleanUp();
    firestoneCleanUp();
    if (pc.current) {
      pc.current.close();
    }
  };

  const streamCleanUp = async () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream.release();
    }
    setLocalStream(null);
    setRemoteStream(null);
  }

  const firestoneCleanUp = async () => {
    const cRef = firestore().collection('meet').doc('chatid');

    if (cRef) {
      const calleeCandidate = await cRef.collection('callee').get();
      calleeCandidate.forEach(async (candidate) => {
        await candidate.ref.delete();
      })
      const callerCandidate = await cRef.collection('caller').get();
      callerCandidate.forEach(async (candidate) => {
        await candidate.ref.delete();
      })

      cRef.delete();
    }

  }

  // Helper function
  const collectIceCandidates = async (
    cRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const candidateCollection = cRef.collection(localName);

    if (pc.current) {
      // On new ICE candidate add it to firestore
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          candidateCollection.add(event.candidate);
        }
      }
    }

    // Get the ice candidate add to firestore and update the local PC
    cRef.collection(remoteName).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type == 'added') {
          const candidate = new RTCIceCandidate(change.doc.data())
          pc.current?.addIceCandidate(candidate)
        }
      })
    })
  }


  // Displays the gettingCall Component
  if (gettingCall) {
    return <GettingCall hangup={hangup} join={join} />
  }

  // Displays local screen on calling
  // Displays both local and remote stream once call is connected
  if (localStream) {
    return (
      <Video
        hangup={hangup}
        localStream={localStream}
        remoteStream={remoteStream}
      />
    )
  }

  // Display the call button
  return (
    <View style={styles.container}>
      <Button iconName="video" backgroundColor="gray" onPress={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
})