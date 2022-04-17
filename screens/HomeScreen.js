import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

const HomeScreen = () => {

    const [hasCameraPermission, setCameraPermission] = useState();
    const [cameraOpened, setCameraOpened] = useState(false); 
    const [faceData, setfaceData] = useState([]);
    const [blinkCount, addBlinkCount] = useState(0);

    useEffect(() => {
        (async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setCameraPermission(status === 'granted');
          console.log('Se ejecuta useEffect con status = ' + status)
        })();
      }, []);

      if(hasCameraPermission === false){
        return <View><Text>Permission denied :(</Text></View>
      }
    
      const handleOpenCamera = () => {
        console.log("Camera is " + cameraOpened)
        setCameraOpened(!cameraOpened);
      }
    
      function getFaceDataView(){
        if(faceData.length === 0){
          return (<View style={[styles.faces, styles.noFaceDetected]} ><Text style={styles.faceDesc} >No faces detected</Text></View>)
        } else {
          return faceData.map((face, index) => {
             const eyesShut = face.rightEyeOpenProbability < 0.4 && face.leftEyeOpenProbability < 0.4
             const winking = !eyesShut && (face.rightEyeOpenProbability < 0.4 || face.leftEyeOpenProbability < 0.4)
             const smiling = face.smilingProbability > 0.9
             return (
               <View style={styles.faces} key={index} >
                  <Text style={!eyesShut ? styles.faceDesc : [styles.faceDesc, styles.faceDescTrue]} >Eyes Shut: {eyesShut.toString()}</Text>
                  <Text style={!winking ? styles.faceDesc : [styles.faceDesc, styles.faceDescTrue]} >Winking: {winking.toString()}</Text>
                  <Text style={!smiling ? styles.faceDesc : [styles.faceDesc, styles.faceDescTrue]} >Smiling: {smiling.toString()}</Text>
                  <Text style={[styles.faceDesc, styles.blinkCount]} >Blink count: {blinkCount}</Text>
               </View>
             )
          })
        }
      }

      const handleFacesDetected = ({ faces }) => {
        if(faces.length > 0 && faceData.length > 0){
          let tempEyesShut1 = faces[0].rightEyeOpenProbability < 0.4 && faces[0].leftEyeOpenProbability < 0.4
          let tempEyesShut2 = faceData[0].rightEyeOpenProbability < 0.4 && faceData[0].leftEyeOpenProbability < 0.4
          if(tempEyesShut1 === false && tempEyesShut2 == true){
            addBlinkCount(blinkCount+1);
            console.log('ENTRA: blinkcount es '+ blinkCount);
          }
        }
        setfaceData(faces);
        //console.log(faces)
      }

    const navigation = useNavigation()

    const handleSignOut = () => {
        auth.signOut().then(() => {
            navigation.replace("Login")
        }).catch(error => alert(error.message))
    }

    return (

            !cameraOpened ? (
                <View style={styles.container} >
                    <Text>Welcome {auth.currentUser?.email}!</Text>
                    <TouchableOpacity onPress={() => handleOpenCamera()} style={styles.button} >
                        <Text style={styles.buttonText} >Start scan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSignOut()} style={[styles.button, styles.buttonSignOut]} >
                        <Text style={styles.buttonText} >Sign out</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.cameraContainer} >
                    <Camera 
                        style={styles.camera}
                        onFacesDetected={handleFacesDetected}
                        faceDetectorSettings={{
                        mode: FaceDetector.FaceDetectorMode.fast,
                        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
                        runClassifications: FaceDetector.FaceDetectorClassifications.all,
                        minDetectionInterval: 100,
                        tracking: true
                        }}
                        type={Camera.Constants.Type.front} >
                        {console.log('HEREEEEEEEEEEEEEEE')}
                    </Camera>
                    <View style={styles.cameraData} >
                        {getFaceDataView()}
                    </View>
                    <Text onPress={() => handleOpenCamera()} style={styles.closeCameraButton} >x</Text>
                </View>
            )

    )
}

export default HomeScreen

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F6F6FF',
        flex: 1,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    button: {
        backgroundColor: '#119DA4',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
        elevation: 5,
        zIndex: 0
    },
    buttonText: {
        color: 'white'
    },
    buttonSignOut: {
        position: 'absolute',
        bottom: -0,
        left: 0,
        width: '107%',
        borderRadius: 0,
        backgroundColor: '#999'
    },

    // CAMERA CONTAINER
    cameraContainer: {
        padding: 12
    },
    cameraData: {
        height: '27%'
    },
    camera: {
        aspectRatio: 3/4
    },
    faces: {

    },
    faceDesc: {
        fontSize: 12,
        padding: 12,
        borderColor: 'black',
        backgroundColor: 'white',
        borderWidth: 1,
        textAlign: 'center'
    },
    faceDescTrue: {
        backgroundColor: '#CCFFDE',
        borderColor: 'green',
        borderWidth: 1,
    },
    blinkCount: {
        backgroundColor: 'white',
    },

    closeCameraButton: {
        position: 'absolute',
        top: 24,
        right: 24,
        backgroundColor: 'white',
        width: 36,
        height: 36,
        textAlign: 'center',
        borderRadius: 36,
        fontSize: 21,
        opacity: 0.4
    }
})