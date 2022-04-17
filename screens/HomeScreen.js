import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, LogBox } from "react-native";
import { auth, db } from "../firebase";
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

LogBox.ignoreLogs(["Setting a timer"])

const HomeScreen = () => {

    const [hasCameraPermission, setCameraPermission] = useState();
    const [cameraOpened, setCameraOpened] = useState(false); 
    const [faceData, setfaceData] = useState([]);
    const [blinkCount, addBlinkCount] = useState(0);
    const [inputData, setInputData] = useState('');
    const [databaseData, setDatabaseData] = useState([]);

    useEffect(() => {
        // Getting camera permision
        (async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setCameraPermission(status === 'granted');
          console.log('Se ejecuta useEffect con status = ' + status)
        })();

        // Database gathering
        const q = query(collection(db, "scans"))
        const unsub = onSnapshot(q, (querySnapshot) => {
            let dataArray = []
            querySnapshot.forEach((doc) => {
                dataArray.push({...doc.data(), id: doc.id})
            })
            setDatabaseData(dataArray)
        })
        return () => unsub()

      }, []);

      if(hasCameraPermission === false){
        return <View><Text>Permission denied :(</Text></View>
      }
    
      const handleOpenCamera = () => {
        setCameraOpened(!cameraOpened);
        if(!cameraOpened){ // If camera was not open that means we are opening it
            setTimeout(() => {
                console.log("ACA SE EJECUTA EL TIME OUT!!!!!!!!")
                handleInputSend()
                setCameraOpened(false);
            }, 5000)
        }
        console.log("Camera is " + !cameraOpened)
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

    const handleInputSend = async () => {
        console.log("inputData is " + inputData)
        if(inputData !== ""){
            await addDoc(collection(db, "scans"), {
                text: inputData,
                timeStamp: '04/16/2022',
                blinkCount,
                faceScore: 87
            }).then(data => {
                console.log("data added successfully!")
            }).catch(e => {
                console.log("Error: " + e.message)
            })
        }
        setInputData("")
    }

    return (

            !cameraOpened ? (
                <View style={styles.container} >
                
                    <View style={styles.startScanContainer} >
                        <Text>Welcome {auth.currentUser?.email}!</Text>

                        <TextInput value={inputData} onChangeText={text => setInputData(text)} placeholder="Enter data" />
                        <Text onPress={() => handleInputSend()} >Send data</Text>

                        <TouchableOpacity onPress={() => handleOpenCamera()} style={[styles.button, styles.buttonStartScan]} >
                            <Text style={styles.buttonText} >Start scan</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.scanResultsContainer}  >
                        <Text style={{fontSize: 18}} >Previous Scans</Text>
                        <ScrollView >
                            {databaseData.length !== 0 ? databaseData.map(data => {
                                return (
                                    <View key={data.id} style={styles.scanResult} >
                                        <Text >Text: {data.text}</Text>
                                        <Text >Blink Count: {data.blinkCount}</Text>
                                        <Text >Score: {data.faceScore}</Text>
                                        <Text >Time: {data.timeStamp}</Text>
                                        <Text style={styles.faceScore} >{data.blinkCount}</Text>
                                    </View>
                                )
                            }) : (
                                <View style={styles.noPreviousScans} >
                                    <Text style={{fontSize: 20, opacity: 0.3}} >No previous scans</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>

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
                        {/*console.log('HEREEEEEEEEEEEEEEE')*/}
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
        backgroundColor: 'white',
        flex: 1,
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
    buttonStartScan: {
        marginBottom: 12
    },
    startScanContainer: {
        backgroundColor: 'white',
        width: '100%',
        height: 164,
        maxHeight: 164,
        zIndex: 2,
        padding: 12
    },

    // SCAN RESULTS CONTAINER

    scanResultsContainer: {
        width: '100%',
        backgroundColor: 'white',
        height: '100%',
        maxHeight: '70%',
        position: 'absolute',
        bottom: 51,
        padding: 12
    },
    scanResult: {
        backgroundColor: '#F1F3F4',
        padding: 12,
        marginBottom: 6,
        width: '100%',
        borderRadius: 2,
        borderWidth: 0.3,
        borderColor: 'gray',
        elevation: 1
    },
    faceScore: {
        position: 'absolute',
        backgroundColor: '#E0FFE2',
        color: 'black',
        top: 24,
        right: 20,
        padding: 12,
        borderRadius: 30,
        height: 60,
        width: 60,
        textAlign: 'center',
        fontSize: 24,
        borderWidth: 1,
        borderColor: '#2DC136'
    },
    noPreviousScans: {
        width: 310,
        height: 140,
        marginTop: 140,
        marginLeft: 40,
        justifyContent: 'center',
        alignItems: 'center'
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