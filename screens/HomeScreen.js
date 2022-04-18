import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, LogBox } from "react-native";
import { auth, db } from "../firebase";
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

LogBox.ignoreLogs(["Setting a timer"])

const HomeScreen = () => {

    const scanIntructions = ["Close left eye", "Close right eye", "Smile", "Normal", "Close left eye & smile", "Normal", "Close right eye & smile", "Normal"];

    const [hasCameraPermission, setCameraPermission] = useState();
    const [cameraOpened, setCameraOpened] = useState(false); 
    const [faceData, setfaceData] = useState([]);
    const [blinkCount, addBlinkCount] = useState(0);
    const [scanScore, setScanScore] = useState(0);
    const [inputData, setInputData] = useState('');
    const [databaseData, setDatabaseData] = useState([]);
    const [sendScanData, setSendScanData] = useState(false);
    const [scanInstructionsIndex, setScanInstructionsIndex] = useState(0);
    const [timeCounter, setTimeCounter] = useState(0);

    useEffect(() => {
        // Getting camera permision
        (async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setCameraPermission(status === 'granted');
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
                setSendScanData(true); // After 1 minute scan we send data gathered to the database
                setCameraOpened(false);
            }, 60000)
        }
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

        if(timeCounter < 40){
            setTimeCounter(timeCounter+1)
        } else { // If timeCounter is 40 it means that 2 seconds went by, now we change gesture asked
            if(scanInstructionsIndex + 1 >= scanIntructions.length){
                setScanInstructionsIndex(0);
            } else setScanInstructionsIndex(scanInstructionsIndex + 1)
            setTimeCounter(0);
        } 

        // CHECK IF USER BLINKS
        if(faces.length > 0 && faceData.length > 0 && timeCounter !== 40){
          let tempEyesShut1 = faces[0].rightEyeOpenProbability < 0.4 && faces[0].leftEyeOpenProbability < 0.4
          let tempEyesShut2 = faceData[0].rightEyeOpenProbability < 0.4 && faceData[0].leftEyeOpenProbability < 0.4
          if(tempEyesShut1 === false && tempEyesShut2 == true){
            addBlinkCount(blinkCount+1);
          }
        }

        // Check user face data to see if it matches instruction every 40 cycles which is roughly 2 seconds
        if(timeCounter === 40 && faces.length > 0){
            const eyesShut = faces[0].rightEyeOpenProbability < 0.4 && faces[0].leftEyeOpenProbability < 0.4
            const smiling = faces[0].smilingProbability > 0.9
            const leftEyeShut = !eyesShut && faces[0].rightEyeOpenProbability < 0.4  // Eyes are not both closed and left is closed
            const rightEyeShut = !eyesShut && faces[0].leftEyeOpenProbability < 0.4  // Eyes are not both closed and left is closed

            switch(scanIntructions[scanInstructionsIndex]){
                case "Close left eye":
                    console.log("User was closing left eye probability: " + leftEyeShut + " -> " + (1 - faces[0].rightEyeOpenProbability))
                    if(!eyesShut) setScanScore(scanScore + (1 - faces[0].rightEyeOpenProbability))
                    break;
                case "Close right eye":
                    console.log("User was closing right eye probability: " + rightEyeShut + " -> " + (1 - faces[0].leftEyeOpenProbability))
                    if(!eyesShut) setScanScore(scanScore + (1 - faces[0].leftEyeOpenProbability))
                    break;
                case "Close right eye & smile":
                    console.log("User was closing right eye & smiling probability: " + (((1 - faces[0].leftEyeOpenProbability) + faces[0].smilingProbability)/2) )
                    if(!eyesShut) setScanScore(scanScore + (((1 - faces[0].leftEyeOpenProbability) + faces[0].smilingProbability)/2) )
                    break;
                case "Close left eye & smile":
                    console.log("User was closing left eye & smilingprobability: " + (((1 - faces[0].rightEyeOpenProbability) + faces[0].smilingProbability)/2))
                    if(!eyesShut) setScanScore(scanScore + (((1 - faces[0].rightEyeOpenProbability) + faces[0].smilingProbability)/2) )
                    break;
                case "Normal":
                    break;
                default:
                    console.log("User was smiling probability: " + smiling + " -> " + faces[0].smilingProbability)
                    setScanScore(scanScore + faces[0].smilingProbability) // if user is smiling we increase score by 1
                    break;
            }
        }

        setfaceData(faces);
      }

    const navigation = useNavigation()

    const handleSignOut = () => {
        auth.signOut().then(() => {
            navigation.replace("Login")
        }).catch(error => alert(error.message))
    }

    const handleInputSend = async () => {

        let time = new Date();
        let timeStamp = (time.getMonth()+1) + "/" + time.getDate() + "/" + time.getFullYear()

        console.log("HERE Scan score sum is " + scanScore)
        console.log("Scan score average is " + (scanScore/13))

        await addDoc(collection(db, "scans"), {
            email: auth.currentUser?.email,
            timeStamp,
            blinkCount,
            scanScore: (scanScore > 13 ? (scanScore/14) : (scanScore/13))*100,
            adjustedScore: (scanScore > 13 ? (scanScore/14) : (scanScore/13)) * (blinkCount < 4 ? 0.9 : (blinkCount < 9 ? 0.95 : 1.05)) * 100
        }).then(data => {
            console.log("data added successfully!")
        }).catch(e => {
            console.log("Error: " + e.message)
        })
        addBlinkCount(0);
        setScanScore(0);
        setScanInstructionsIndex(0);
    }

    const handleSendScanData = () => {
        handleInputSend();
        setSendScanData(false);
    }

    // Get color from color scheme to represent good, medium, and bad scores
    const getScoreColor = score => {
        if(score > 70){
            return [styles.faceScore, styles.resultGreen]
        } else if(score > 30) {
            return [styles.faceScore, styles.resultYellow]
        } else return [styles.faceScore, styles.resultRed]
    }

    // Preform calculations to obtain max, average, and total sum of scans
    const getHighlight = string => {
        if(databaseData.length !== 0){
            switch(string){
                case "max":
                    let max = 0;
                    for(let i = 0; i < databaseData.length; i++){
                        if(auth.currentUser?.email === databaseData[i].email){
                            if(max < databaseData[i].adjustedScore) max = databaseData[i].adjustedScore;
                        }
                    }
                    return Math.round(max*10)/10;
                    break;
                case "avg-score":
                    let counterScore = 0;
                    let counter = 0;
                    for(let i = 0; i < databaseData.length; i++){
                        if(auth.currentUser?.email === databaseData[i].email){
                            counter++;
                            counterScore += databaseData[i].adjustedScore;
                        }
                    }
                    return Math.round((counterScore / counter)*10)/10;
                    break;
                case "avg-blink":
                    let counterBlink = 0;
                    let counter2 = 0;
                    for(let i = 0; i < databaseData.length; i++){
                        if(auth.currentUser?.email === databaseData[i].email){
                            counterBlink += databaseData[i].blinkCount;
                            counter2++;
                        }
                    }
                    return Math.round((counterBlink/counter2)*10)/10;
                default:
                    let count = 0;
                    for(let i = 0; i < databaseData.length; i++){
                        if(auth.currentUser?.email === databaseData[i].email) count++;
                    }
                    return count;
                    break;
            }
        } else return "-";
    }

    return (

            !cameraOpened ? (
                <View style={styles.container} >

                    <View style={styles.startScanContainer} >
                        <Text>Welcome {auth.currentUser?.email}!</Text>

                        <View style={styles.userHighlights} >
                            <View style={styles.highLightItem} >
                                <Text style={{fontWeight: 'bold'}} >Max score</Text>
                                <Text>{getHighlight("max")}</Text>
                            </View>
                            <View style={styles.highLightItem} >
                                <Text style={{fontWeight: 'bold'}} >Avg. score</Text>
                                <Text>{getHighlight("avg-score")}</Text>
                            </View>
                            <View style={styles.highLightItem} >
                                <Text style={{fontWeight: 'bold'}} >Avg. blinks</Text>
                                <Text>{getHighlight("avg-blink")}</Text>
                            </View>
                            <View style={styles.highLightItem} >
                                <Text style={{fontWeight: 'bold'}} >Total scans</Text>
                                <Text>{getHighlight()}</Text>
                            </View>
                        </View>

                        {sendScanData ? handleSendScanData() : null}

                        <TouchableOpacity onPress={() => handleOpenCamera()} style={[styles.button, styles.buttonStartScan]} >
                            <Text style={styles.buttonText} >Start scan</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.scanResultsContainer}  >
                        <Text style={{fontSize: 18, marginBottom: 10, color: 'black'}} >Previous Scans</Text>
                        <ScrollView >
                            {databaseData.length !== 0 ? databaseData.map(data => {
                                if(data.email === auth.currentUser?.email){
                                    return (
                                    <View key={data.id} style={styles.scanResult} >
                                        <Text >Final score: {data.adjustedScore}</Text>
                                        <Text >Blink Count: {data.blinkCount}</Text>
                                        <Text >Accuracy: {data.scanScore}</Text>
                                        <Text >Date: {data.timeStamp}</Text>
                                        <Text style={getScoreColor(data.scanScore)} >{data.adjustedScore > 100 ? 100 : Math.round(data.adjustedScore*10)/10}</Text>
                                    </View>
                                    )
                                } else return null
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
                        minDetectionInterval: 50,
                        tracking: true
                        }}
                        type={Camera.Constants.Type.front} >
                    </Camera>
                    <View style={styles.scanInstructionsContainer} >
                        <Text style={{fontSize: 32, color: 'white'}} >{scanIntructions[scanInstructionsIndex]}</Text>
                    </View>
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
        marginBottom: 12,
        position: 'absolute',
        bottom: -12,
        left: 12,
        width: '100%'
    },
    startScanContainer: {
        backgroundColor: 'white',
        width: '100%',
        height: 193,
        maxHeight: 193,
        padding: 12
    },

    // USER HIGHLIGHTS

    userHighlights: {
        marginTop: 12,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 76
    },
    highLightItem: {
        backgroundColor: '#F1F3F4',
        width: 80,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 0.20,
        borderRadius: 4,
        borderColor: 'gray',
        borderWidth: 0.3,
        elevation: 3
    },

    // SCAN RESULTS CONTAINER

    scanResultsContainer: {
        width: '100%',
        backgroundColor: 'white',
        height: '100%',
        maxHeight: '66%',
        position: 'absolute',
        bottom: 51,
        padding: 12
    },
    scanResult: {
        backgroundColor: '#F1F3F4',
        padding: 12,
        marginBottom: 12,
        width: '100%',
        borderRadius: 2,
        borderWidth: 0.3,
        borderColor: 'gray',
        elevation: 3
    },
    faceScore: {
        position: 'absolute',
        color: '#535353',
        top: 24,
        right: 20,
        paddingTop: 18,
        borderRadius: 30,
        height: 60,
        width: 60,
        textAlign: 'center',
        fontSize: 16,
        borderWidth: 1
    },
    noPreviousScans: {
        width: 310,
        height: 140,
        marginTop: 140,
        marginLeft: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    // Score color scheme
    resultGreen: {
        backgroundColor: '#E0FFE2',
        borderColor: '#2DC136'
    },
    resultYellow: {
        backgroundColor: '#FFFDDA',
        borderColor: '#D8CF26'
    },
    resultRed: {
        backgroundColor: '#FFD3D3',
        borderColor: 'red'
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
    scanInstructionsContainer: {
        position: 'absolute',
        left: 25,
        top: 450,
        height: 80,
        width: 360,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
        backgroundColor: 'transparent',
        textAlign: 'center'
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