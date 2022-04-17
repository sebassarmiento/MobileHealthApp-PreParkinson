import React from "react";
import { StyleSheet, Text, View, Dimensions, ActivityIndicator } from "react-native";

const height = Dimensions.get("window").height;

const Loader = () => {

    return (
        <View style={styles.container} >
            <ActivityIndicator style={styles.loader} size={70} color="#119DA4" />
        </View>
    )
}


export default Loader;


const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        opacity: 0.8,
        position: 'absolute',
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width,
        zIndex: 2,
        justifyContent: 'center',
        alignItems: 'center'
    }
})