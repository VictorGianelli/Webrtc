import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MediaStream, RTCView } from 'react-native-webrtc';
import { Button } from './Button';

interface Props {
  hangup: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}

function ButtonContainer(props: Props) {
  return (
    <View style={styles.bContainer}>
      
      <Button
        iconName="phone"
        backgroundColor="red"
        onPress={props.hangup}
      />
      
    </View>
  );
}

export default function Video(props: Props) {
  //On call we gona display te local stream
  if (props.localStream && !props.remoteStream) {
    return (
      <View style={styles.container}>
        <RTCView
          streamURL={props.localStream.toURL()}
          objectFit={'cover'}
          style={styles.video}
        />
        <ButtonContainer hangup={props.hangup} />;
      </View>)
  }
  //Once call is connected we will display
  // local Stream on top of the remote Stream
  if (props.localStream && props.remoteStream) {
    return (
      <View style={styles.container}>
        <RTCView
          streamURL={props.remoteStream.toURL()}
          objectFit={'cover'}
          style={styles.video}
        />
        <RTCView
          streamURL={props.localStream.toURL()}
          objectFit={'cover'}
          style={styles.videoLocal}
        />
        <ButtonContainer hangup={props.hangup} />;
      </View>)
  }

  return <ButtonContainer hangup={props.hangup} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  video: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  videoLocal: {
    position: 'absolute',
    width: 100,
    height: 150,
    top: 0,
    left: 20,
    elevation: 10,
  },
  bContainer: {
    flexDirection: 'row',
    bottom: 30,
  },
})