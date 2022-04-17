import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, TextInput, TouchableOpacity } from "react-native";
import Loader from "../components/Loader";
import { auth } from '../firebase';

const LoginScreen = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation()

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if(user){
                navigation.replace("Home")
            }
        })
        return unsubscribe;
    }, [])

    const handleSignUp = () => {
        setLoading(true)
        auth.createUserWithEmailAndPassword(email, password).then(userCredentials => {
            const user = userCredentials.user
            console.log("Registered successfully with " + user.email)
            setLoading(false)
        }).catch(error => {
            alert(error.message)
            setLoading(false)
        })
    }

    const handleLogin = () => {
        setLoading(true)
        auth.signInWithEmailAndPassword(email, password).then(userCredentials => {
            const user = userCredentials.user
            console.log("Login successful! with " + user.email)
            setLoading(false)
        }).catch(error => {
            alert(error.message)
            setLoading(false)
        })
    }

    return (
        <KeyboardAvoidingView style={styles.container} >
            {loading ? <Loader /> : null}
            <View style={styles.inputContainer} >
                <Text style={styles.loginTitle} >Welcome</Text>
                <TextInput value={email} onChangeText={email => setEmail(email)} style={styles.input} placeholder="Email" />
                <TextInput value={password} onChangeText={pass => setPassword(pass)} secureTextEntry style={styles.input} placeholder="Password" />
            </View>
            <View style={styles.buttonContainer} >
                <TouchableOpacity onPress={() => handleLogin()} style={styles.button} >
                    <Text style={styles.buttonText} >Login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSignUp()} style={[styles.button, styles.buttonSignUp]} >
                    <Text style={[styles.buttonText, {color: '#119DA4'}]} >Register</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}

export default LoginScreen

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F1F1F1',
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    inputContainer: {
        backgroundColor: 'transparent'
    },
    loginTitle: {
        fontSize: 32,
        paddingBottom: 12
    },
    input: {
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 4,
        fontSize: 14,
        marginBottom: 6,
        borderWidth: 0.3,
        borderColor: 'gray'
    },

    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        zIndex: 1,
    },
    button: {
        backgroundColor: '#119DA4',
        padding: 14,
        paddingHorizontal: 24,
        borderRadius: 4,
        elevation: 5,
        flexGrow: 0.5,
        alignItems: 'center'
    },
    buttonText: {
        color: 'white',
        fontSize: 16
    },
    buttonSignUp: {
        backgroundColor: 'white',
        borderColor: '#119DA4',
        borderWidth: 1,
        marginLeft: 6,
        maxWidth: '50%'
    }
})