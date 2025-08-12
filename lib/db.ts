import mongoose from "mongoose";
 
const MONGODB_URI = process.env.MONGODBURI!

if(!MONGODB_URI){
    throw new Error("Please define mongoURI in env varriables")
}

let cached =  global.mongoose;
if(!cached){
    cached = global.mongoose = {
        conn:null,
        promise:null
    }
}

export async function connectToDateBase(){
    if(cached.conn){
        return cached.conn;
    }

    if(!cached.promise){
        const opts = {}
        mongoose.connect(MONGODB_URI,opts)
        .then(()=>mongoose.connection)
    }
    try {
     cached.conn =    await cached.promise
    } catch (error) {
        cached.promise = null
        throw error;
    }
    return cached.conn
}