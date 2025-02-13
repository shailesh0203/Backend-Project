//require('dotenv').config({path: `./env`})
import dotenv from "dotenv"
import mongoose from 'mongoose'
import {app} from './app.js'
import { DB_NAME } from './constants.js';
import connectDB from './db/index.js';
dotenv.config();
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed!!!!",err)
})
/*s
import express from "express"
const app=express()
// function connectDB(){}

// connectDB()
;(async()=>{
    try{
    await mongoose.connect(`${$process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("errror",(error)=>{
        console.log("ERRRR: ",error);
        throw error
    })
    app.listen(process.env.port,()=>{
        console.log(`App is listening on port ${process.env.PORT}`);
    })
    }catch(error){
       console.log("ERROR: ",error)
       throw err
    }
})()*/